import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingCart, Store, Plus, Minus, Trash2, ExternalLink, CheckCircle, Package } from 'lucide-react';

interface GroceryStore {
  id: string;
  name: string;
  region: string;
  delivery_available: boolean;
  logo_url: string | null;
}

interface GroceryProduct {
  id: string;
  store_id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  unit: string;
  in_stock: boolean;
  image_url: string | null;
}

interface ShoppingListItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  price: number;
  store_id: string;
  checked: boolean;
}

interface SmartShoppingList {
  id: string;
  name: string;
  store_id: string;
  items: ShoppingListItem[];
  total_cost: number;
  status: string;
  checkout_url: string | null;
}

export function GroceryShopping() {
  const [stores, setStores] = useState<GroceryStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<GroceryStore | null>(null);
  const [products, setProducts] = useState<GroceryProduct[]>([]);
  const [shoppingLists, setShoppingLists] = useState<SmartShoppingList[]>([]);
  const [currentList, setCurrentList] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadStores();
    loadShoppingLists();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      loadProducts(selectedStore.id);
    }
  }, [selectedStore]);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('grocery_stores')
        .select('*')
        .eq('delivery_available', true);

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error loading stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (storeId: string) => {
    try {
      const { data, error } = await supabase
        .from('grocery_products')
        .select('*')
        .eq('store_id', storeId)
        .eq('in_stock', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadShoppingLists = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('smart_shopping_lists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShoppingLists(data || []);
    } catch (error) {
      console.error('Error loading shopping lists:', error);
    }
  };

  const addToList = (product: GroceryProduct) => {
    const existingItem = currentList.find((item) => item.product_id === product.id);

    if (existingItem) {
      setCurrentList(
        currentList.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCurrentList([
        ...currentList,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit: product.unit,
          price: product.price,
          store_id: product.store_id,
          checked: false,
        },
      ]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCurrentList(
      currentList
        .map((item) =>
          item.product_id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromList = (productId: string) => {
    setCurrentList(currentList.filter((item) => item.product_id !== productId));
  };

  const toggleItemChecked = (productId: string) => {
    setCurrentList(
      currentList.map((item) =>
        item.product_id === productId ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const calculateTotal = () => {
    return currentList.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const saveShoppingList = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const listName = `Shopping List - ${new Date().toLocaleDateString()}`;
      const totalCost = calculateTotal();

      const { error } = await supabase.from('smart_shopping_lists').insert({
        profile_id: user.id,
        name: listName,
        store_id: selectedStore?.id || null,
        items: currentList,
        total_cost: totalCost,
        list_type: 'weekly',
        status: 'ready',
      });

      if (error) throw error;

      alert('Shopping list saved successfully!');
      setCurrentList([]);
      loadShoppingLists();
    } catch (error) {
      console.error('Error saving shopping list:', error);
      alert('Failed to save shopping list');
    }
  };

  const generateFromMealPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: mealPlans } = await supabase
        .from('weekly_meal_plans')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!mealPlans) {
        alert('No active meal plan found. Create a meal plan first.');
        return;
      }

      const { data: recipes } = await supabase
        .from('recipes')
        .select('ingredients')
        .limit(5);

      if (!recipes) return;

      const aggregatedIngredients: { [key: string]: number } = {};

      recipes.forEach((recipe: any) => {
        recipe.ingredients.forEach((ing: any) => {
          const name = ing.ingredient;
          aggregatedIngredients[name] = (aggregatedIngredients[name] || 0) + (ing.quantity || 1);
        });
      });

      const generatedList: ShoppingListItem[] = [];

      for (const [ingredientName, quantity] of Object.entries(aggregatedIngredients)) {
        const { data: product } = await supabase
          .from('grocery_products')
          .select('*')
          .ilike('name', `%${ingredientName}%`)
          .eq('in_stock', true)
          .limit(1)
          .maybeSingle();

        if (product) {
          generatedList.push({
            product_id: product.id,
            product_name: product.name,
            quantity: quantity,
            unit: product.unit,
            price: product.price,
            store_id: product.store_id,
            checked: false,
          });
        }
      }

      if (generatedList.length > 0) {
        const totalCost = generatedList.reduce((sum, item) => sum + item.price * item.quantity, 0);

        const { error } = await supabase.from('smart_shopping_lists').insert({
          profile_id: user.id,
          name: `Meal Plan Shopping List - ${new Date().toLocaleDateString()}`,
          source_meal_plan_id: mealPlans.id,
          items: generatedList,
          total_cost: totalCost,
          list_type: 'weekly',
          status: 'ready',
        });

        if (error) throw error;

        alert(`Generated shopping list with ${generatedList.length} items!`);
        loadShoppingLists();
      } else {
        alert('No matching products found for meal plan ingredients.');
      }
    } catch (error) {
      console.error('Error generating shopping list:', error);
      alert('Failed to generate shopping list from meal plan');
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-text mx-auto mb-4"></div>
        <p className="font-light">Loading grocery stores...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-heading">SMART GROCERY</h1>
          <p className="font-light text-gray-600 mt-2">
            Condition-safe shopping from your favorite stores
          </p>
        </div>
        <button
          onClick={generateFromMealPlan}
          className="flex items-center space-x-2 px-6 py-3 bg-brand-text text-white rounded-lg font-medium hover:opacity-90 transition-all"
        >
          <Package className="w-5 h-5" />
          <span>Generate from Meal Plan</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-2xl font-heading mb-4">SELECT STORE</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => setSelectedStore(store)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedStore?.id === store.id
                      ? 'border-brand-text bg-brand-cream'
                      : 'border-gray-300 hover:border-brand-button-light'
                  }`}
                >
                  <Store className="w-8 h-8 mx-auto mb-2 text-brand-text" />
                  <p className="font-medium text-center">{store.name}</p>
                </button>
              ))}
            </div>
          </div>

          {selectedStore && (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-2xl font-heading mb-2">{selectedStore.name} Products</h2>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-button-dark"
                />
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-brand-cream rounded-lg hover:bg-brand-button-light transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-600">
                        {product.brand} - {product.unit}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-heading text-lg">£{product.price.toFixed(2)}</span>
                      <button
                        onClick={() => addToList(product)}
                        className="p-2 bg-brand-text text-white rounded-lg hover:opacity-90 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-2xl font-heading mb-4">SAVED SHOPPING LISTS</h2>
            {shoppingLists.length === 0 ? (
              <p className="text-gray-500 font-light text-center py-8">
                No saved shopping lists yet
              </p>
            ) : (
              <div className="space-y-3">
                {shoppingLists.map((list) => (
                  <div
                    key={list.id}
                    className="flex items-center justify-between p-4 bg-brand-cream rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{list.name}</p>
                      <p className="text-sm text-gray-600">
                        {list.items.length} items - £{list.total_cost.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          list.status === 'ready'
                            ? 'bg-green-100 text-green-700'
                            : list.status === 'ordered'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {list.status.toUpperCase()}
                      </span>
                      {list.checkout_url && (
                        <a
                          href={list.checkout_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-brand-text text-white rounded-lg hover:opacity-90"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-6 shadow-sm sticky top-6">
            <div className="flex items-center space-x-2 mb-4">
              <ShoppingCart className="w-6 h-6 text-brand-text" />
              <h2 className="text-2xl font-heading">CURRENT LIST</h2>
            </div>

            {currentList.length === 0 ? (
              <p className="text-gray-500 font-light text-center py-8">
                Your shopping list is empty
              </p>
            ) : (
              <>
                <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                  {currentList.map((item) => (
                    <div key={item.product_id} className="border-b border-gray-200 pb-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start space-x-2 flex-1">
                          <button
                            onClick={() => toggleItemChecked(item.product_id)}
                            className="mt-1"
                          >
                            {item.checked ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                            )}
                          </button>
                          <div className="flex-1">
                            <p
                              className={`font-medium ${
                                item.checked ? 'line-through text-gray-500' : ''
                              }`}
                            >
                              {item.product_name}
                            </p>
                            <p className="text-sm text-gray-600">
                              £{item.price.toFixed(2)} per {item.unit}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromList(item.product_id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(item.product_id, -1)}
                            className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-medium w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product_id, 1)}
                            className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="font-medium">
                          £{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-300 pt-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Total:</span>
                    <span className="text-2xl font-heading">£{calculateTotal().toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-500">Excluding delivery fees</p>
                </div>

                <button
                  onClick={saveShoppingList}
                  className="w-full px-6 py-3 bg-brand-text text-white rounded-lg font-medium hover:opacity-90 transition-all"
                >
                  Save Shopping List
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
