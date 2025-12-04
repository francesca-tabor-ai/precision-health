import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Heart, Clock, ChefHat, Users, Search, Filter, Star } from 'lucide-react';

interface Recipe {
  id: string;
  name: string;
  description: string;
  species_type: 'human' | 'dog' | 'cat';
  ingredients: any[];
  instructions: string;
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  difficulty_level: 'easy' | 'medium' | 'hard';
  nutritional_breakdown: any;
  condition_tags: string[];
  dietary_tags: string[];
}

interface UserRecipe {
  recipe_id: string;
  is_favorite: boolean;
  tried: boolean;
  rating: number | null;
}

export function RecipeBrowser() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [userRecipes, setUserRecipes] = useState<UserRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<'all' | 'human' | 'dog' | 'cat'>('human');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    loadRecipes();
    loadUserRecipes();
  }, [speciesFilter]);

  const loadRecipes = async () => {
    try {
      let query = supabase.from('recipes').select('*');

      if (speciesFilter !== 'all') {
        query = query.eq('species_type', speciesFilter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setRecipes(data || []);
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRecipes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_recipes')
        .select('recipe_id, is_favorite, tried, rating');

      if (error) throw error;
      setUserRecipes(data || []);
    } catch (error) {
      console.error('Error loading user recipes:', error);
    }
  };

  const toggleFavorite = async (recipeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const existingUserRecipe = userRecipes.find(ur => ur.recipe_id === recipeId);

      if (existingUserRecipe) {
        const { error } = await supabase
          .from('user_recipes')
          .update({ is_favorite: !existingUserRecipe.is_favorite })
          .eq('recipe_id', recipeId)
          .eq('profile_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_recipes')
          .insert({
            profile_id: user.id,
            recipe_id: recipeId,
            is_favorite: true,
          });

        if (error) throw error;
      }

      loadUserRecipes();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isFavorite = (recipeId: string) => {
    return userRecipes.find(ur => ur.recipe_id === recipeId)?.is_favorite || false;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-text mx-auto mb-4"></div>
        <p className="font-light">Loading recipes...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-heading">RECIPE LIBRARY</h1>
      </div>

      <div className="mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search recipes..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-button-dark"
          />
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setSpeciesFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              speciesFilter === 'all'
                ? 'bg-brand-text text-white'
                : 'bg-white text-brand-text border border-gray-300 hover:bg-brand-cream'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSpeciesFilter('human')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              speciesFilter === 'human'
                ? 'bg-brand-text text-white'
                : 'bg-white text-brand-text border border-gray-300 hover:bg-brand-cream'
            }`}
          >
            Human
          </button>
          <button
            onClick={() => setSpeciesFilter('dog')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              speciesFilter === 'dog'
                ? 'bg-brand-text text-white'
                : 'bg-white text-brand-text border border-gray-300 hover:bg-brand-cream'
            }`}
          >
            Dog
          </button>
          <button
            onClick={() => setSpeciesFilter('cat')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              speciesFilter === 'cat'
                ? 'bg-brand-text text-white'
                : 'bg-white text-brand-text border border-gray-300 hover:bg-brand-cream'
            }`}
          >
            Cat
          </button>
        </div>
      </div>

      {filteredRecipes.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-2xl font-heading mb-2">NO RECIPES FOUND</h3>
          <p className="font-light text-gray-600">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer"
              onClick={() => setSelectedRecipe(recipe)}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-heading mb-1">{recipe.name}</h3>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      recipe.species_type === 'human' ? 'bg-blue-100 text-blue-700' :
                      recipe.species_type === 'dog' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {recipe.species_type}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(recipe.id);
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Heart
                      className={`w-6 h-6 ${
                        isFavorite(recipe.id) ? 'fill-red-500 text-red-500' : ''
                      }`}
                    />
                  </button>
                </div>

                <p className="text-sm font-light text-gray-600 mb-4 line-clamp-2">
                  {recipe.description}
                </p>

                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)} min</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{recipe.servings} servings</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <ChefHat className="w-4 h-4" />
                    <span className="capitalize">{recipe.difficulty_level}</span>
                  </div>
                </div>

                {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {recipe.dietary_tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-brand-cream text-brand-text text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          isFavorite={isFavorite(selectedRecipe.id)}
          onClose={() => setSelectedRecipe(null)}
          onToggleFavorite={() => toggleFavorite(selectedRecipe.id)}
        />
      )}
    </div>
  );
}

function RecipeModal({
  recipe,
  isFavorite,
  onClose,
  onToggleFavorite,
}: {
  recipe: Recipe;
  isFavorite: boolean;
  onClose: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-3xl font-heading mb-2">{recipe.name}</h2>
              <p className="font-light text-gray-600">{recipe.description}</p>
            </div>
            <button
              onClick={onToggleFavorite}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <Heart
                className={`w-8 h-8 ${
                  isFavorite ? 'fill-red-500 text-red-500' : ''
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-brand-cream rounded-lg">
            <div className="text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-brand-text" />
              <p className="text-sm font-medium">Total Time</p>
              <p className="text-lg font-heading">
                {(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)} min
              </p>
            </div>
            <div className="text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-brand-text" />
              <p className="text-sm font-medium">Servings</p>
              <p className="text-lg font-heading">{recipe.servings}</p>
            </div>
            <div className="text-center">
              <ChefHat className="w-6 h-6 mx-auto mb-2 text-brand-text" />
              <p className="text-sm font-medium">Difficulty</p>
              <p className="text-lg font-heading capitalize">{recipe.difficulty_level}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-heading mb-3">INGREDIENTS</h3>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing: any, index: number) => (
                <li key={index} className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-brand-text rounded-full"></span>
                  <span className="font-light">
                    {ing.quantity} {ing.unit} {ing.ingredient}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-heading mb-3">INSTRUCTIONS</h3>
            <p className="font-light whitespace-pre-line leading-relaxed">{recipe.instructions}</p>
          </div>

          {recipe.condition_tags && recipe.condition_tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-heading mb-3">HEALTH BENEFITS</h3>
              <div className="flex flex-wrap gap-2">
                {recipe.condition_tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-2 bg-green-100 text-green-700 text-sm rounded-lg font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-brand-button-light text-brand-text rounded-lg font-medium hover:bg-brand-button-medium transition-all"
            >
              Close
            </button>
            <button className="flex-1 px-6 py-3 bg-brand-text text-white rounded-lg font-medium hover:opacity-90 transition-all">
              Add to Meal Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
