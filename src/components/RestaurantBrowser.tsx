import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Store, Clock, Star, TrendingUp, AlertTriangle, CheckCircle, ShoppingBag, Filter } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  cuisine_type: string;
  delivery_platform: string;
  location: string;
  rating: number;
  delivery_time_minutes: number;
  minimum_order: number;
  delivery_fee: number;
  is_clinical_partner: boolean;
}

interface Dish {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  ingredients: string[];
  allergens: string[];
  price: number;
  category: string;
  image_url: string | null;
  available: boolean;
}

interface DishRiskAssessment {
  dish_id: string;
  risk_classification: 'safe' | 'beneficial' | 'neutral' | 'caution' | 'avoid';
  risk_score: number;
  rationale: string;
  contraindications: any[];
  recommended_substitutions: any[];
}

export function RestaurantBrowser() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [riskAssessments, setRiskAssessments] = useState<Map<string, DishRiskAssessment>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filterRisk, setFilterRisk] = useState<'all' | 'safe' | 'beneficial'>('all');
  const [cuisineFilter, setCuisineFilter] = useState<string>('all');

  useEffect(() => {
    loadRestaurants();
  }, []);

  useEffect(() => {
    if (selectedRestaurant) {
      loadDishes(selectedRestaurant.id);
    }
  }, [selectedRestaurant]);

  const loadRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('rating', { ascending: false });

      if (error) throw error;
      setRestaurants(data || []);
    } catch (error) {
      console.error('Error loading restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDishes = async (restaurantId: string) => {
    try {
      const { data, error } = await supabase
        .from('dishes')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('available', true);

      if (error) throw error;
      setDishes(data || []);

      await assessDishRisks(data || []);
    } catch (error) {
      console.error('Error loading dishes:', error);
    }
  };

  const assessDishRisks = async (dishList: Dish[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const assessmentMap = new Map<string, DishRiskAssessment>();

      for (const dish of dishList) {
        const assessment = await calculateDishRisk(dish, user.id);
        assessmentMap.set(dish.id, assessment);

        const { error } = await supabase
          .from('dish_risk_assessments')
          .upsert({
            profile_id: user.id,
            dish_id: dish.id,
            ...assessment,
            assessed_at: new Date().toISOString(),
          });

        if (error) console.error('Error saving assessment:', error);
      }

      setRiskAssessments(assessmentMap);
    } catch (error) {
      console.error('Error assessing dish risks:', error);
    }
  };

  const calculateDishRisk = async (dish: Dish, userId: string): Promise<DishRiskAssessment> => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('species_type, conditions')
        .eq('id', userId)
        .maybeSingle();

      const speciesType = profile?.species_type || 'human';
      let riskClassification: 'safe' | 'beneficial' | 'neutral' | 'caution' | 'avoid' = 'neutral';
      let riskScore = 50;
      let rationale = 'This dish has been reviewed for your profile.';
      const contraindications: any[] = [];

      for (const ingredientName of dish.ingredients) {
        const { data: ingredient } = await supabase
          .from('ingredients')
          .select('*, species_safe, toxicity_warnings')
          .ilike('name', ingredientName)
          .maybeSingle();

        if (ingredient) {
          if (ingredient.toxicity_warnings && ingredient.toxicity_warnings.length > 0) {
            const toxicForSpecies = ingredient.toxicity_warnings.find(
              (warning: any) => warning.species?.includes(speciesType)
            );

            if (toxicForSpecies) {
              riskClassification = 'avoid';
              riskScore = 95;
              rationale = `DANGER: ${ingredient.name} is toxic to ${speciesType}s. ${toxicForSpecies.effect || ''}`;
              contraindications.push({
                ingredient: ingredient.name,
                reason: 'toxic',
                severity: 'critical',
              });
              break;
            }
          }

          if (ingredient.species_safe && ingredient.species_safe[speciesType] === false) {
            riskClassification = 'avoid';
            riskScore = 90;
            rationale = `${ingredient.name} is not safe for ${speciesType} consumption.`;
            contraindications.push({
              ingredient: ingredient.name,
              reason: 'unsafe_for_species',
              severity: 'high',
            });
            break;
          }

          const { data: contraindication } = await supabase
            .from('ingredient_contraindications')
            .select('*')
            .eq('ingredient_id', ingredient.id)
            .eq('species_type', speciesType)
            .maybeSingle();

          if (contraindication) {
            if (contraindication.contraindication_type === 'avoid') {
              riskClassification = 'caution';
              riskScore = Math.max(riskScore, 70);
              rationale = `Contains ${ingredient.name}: ${contraindication.rationale}`;
              contraindications.push({
                ingredient: ingredient.name,
                reason: contraindication.rationale,
                severity: 'medium',
              });
            } else if (contraindication.contraindication_type === 'limit') {
              if (riskClassification === 'neutral') {
                riskClassification = 'caution';
                riskScore = Math.max(riskScore, 60);
              }
            }
          }
        }
      }

      if (riskClassification === 'neutral' && contraindications.length === 0) {
        riskClassification = 'safe';
        riskScore = 20;
        rationale = 'This dish appears safe based on your health profile.';
      }

      return {
        dish_id: dish.id,
        risk_classification: riskClassification,
        risk_score: riskScore,
        rationale,
        contraindications,
        recommended_substitutions: [],
      };
    } catch (error) {
      console.error('Error calculating risk:', error);
      return {
        dish_id: dish.id,
        risk_classification: 'neutral',
        risk_score: 50,
        rationale: 'Unable to assess risk at this time.',
        contraindications: [],
        recommended_substitutions: [],
      };
    }
  };

  const getRiskIcon = (classification: string) => {
    switch (classification) {
      case 'beneficial':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'safe':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'caution':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'avoid':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getRiskColor = (classification: string) => {
    switch (classification) {
      case 'beneficial':
        return 'border-green-500 bg-green-50';
      case 'safe':
        return 'border-green-400 bg-green-50';
      case 'caution':
        return 'border-yellow-400 bg-yellow-50';
      case 'avoid':
        return 'border-red-500 bg-red-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  const filteredDishes = dishes.filter((dish) => {
    const assessment = riskAssessments.get(dish.id);
    if (filterRisk === 'safe') {
      return assessment?.risk_classification === 'safe' || assessment?.risk_classification === 'beneficial';
    }
    if (filterRisk === 'beneficial') {
      return assessment?.risk_classification === 'beneficial';
    }
    return assessment?.risk_classification !== 'avoid';
  });

  const cuisineTypes = Array.from(new Set(restaurants.map(r => r.cuisine_type).filter(Boolean)));

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-text mx-auto mb-4"></div>
        <p className="font-light">Loading restaurants...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-heading">SMART DELIVERY</h1>
          <p className="font-light text-gray-600 mt-2">
            Medically-vetted dishes from local restaurants
          </p>
        </div>
      </div>

      {!selectedRestaurant ? (
        <div>
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="font-medium">Filter by cuisine:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCuisineFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  cuisineFilter === 'all'
                    ? 'bg-brand-text text-white'
                    : 'bg-white text-brand-text border border-gray-300 hover:bg-brand-cream'
                }`}
              >
                All Cuisines
              </button>
              {cuisineTypes.map((cuisine) => (
                <button
                  key={cuisine}
                  onClick={() => setCuisineFilter(cuisine)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    cuisineFilter === cuisine
                      ? 'bg-brand-text text-white'
                      : 'bg-white text-brand-text border border-gray-300 hover:bg-brand-cream'
                  }`}
                >
                  {cuisine}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants
              .filter((r) => cuisineFilter === 'all' || r.cuisine_type === cuisineFilter)
              .map((restaurant) => (
                <div
                  key={restaurant.id}
                  onClick={() => setSelectedRestaurant(restaurant)}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-xl font-heading mb-1">{restaurant.name}</h3>
                        <p className="text-sm text-gray-500">{restaurant.cuisine_type}</p>
                      </div>
                      {restaurant.is_clinical_partner && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                          CLINICAL
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span>{restaurant.rating.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{restaurant.delivery_time_minutes} min</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        Min £{restaurant.minimum_order.toFixed(2)}
                      </span>
                      <span className="text-brand-text font-medium">
                        £{restaurant.delivery_fee.toFixed(2)} delivery
                      </span>
                    </div>

                    <div className="mt-4">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {restaurant.delivery_platform}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={() => setSelectedRestaurant(null)}
            className="mb-6 text-brand-text font-medium hover:underline"
          >
            ← Back to restaurants
          </button>

          <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-heading mb-2">{selectedRestaurant.name}</h2>
                <p className="text-gray-600">{selectedRestaurant.cuisine_type}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-1 mb-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="text-lg font-medium">{selectedRestaurant.rating.toFixed(1)}</span>
                </div>
                <div className="flex items-center space-x-1 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{selectedRestaurant.delivery_time_minutes} min</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 flex space-x-2">
            <button
              onClick={() => setFilterRisk('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filterRisk === 'all'
                  ? 'bg-brand-text text-white'
                  : 'bg-white text-brand-text border border-gray-300'
              }`}
            >
              All Dishes
            </button>
            <button
              onClick={() => setFilterRisk('safe')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filterRisk === 'safe'
                  ? 'bg-brand-text text-white'
                  : 'bg-white text-brand-text border border-gray-300'
              }`}
            >
              Safe for Me
            </button>
            <button
              onClick={() => setFilterRisk('beneficial')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filterRisk === 'beneficial'
                  ? 'bg-brand-text text-white'
                  : 'bg-white text-brand-text border border-gray-300'
              }`}
            >
              Recommended
            </button>
          </div>

          <div className="space-y-4">
            {filteredDishes.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-2xl font-heading mb-2">NO DISHES AVAILABLE</h3>
                <p className="font-light text-gray-600">
                  Try adjusting your filters or check back later
                </p>
              </div>
            ) : (
              filteredDishes.map((dish) => {
                const assessment = riskAssessments.get(dish.id);
                return (
                  <div
                    key={dish.id}
                    className={`border-2 rounded-xl p-6 transition-all ${
                      assessment ? getRiskColor(assessment.risk_classification) : 'border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-xl font-heading">{dish.name}</h3>
                          {assessment && getRiskIcon(assessment.risk_classification)}
                        </div>
                        <p className="font-light text-gray-700 mb-3">{dish.description}</p>

                        {assessment && (
                          <div className="mb-3 p-3 bg-white rounded-lg">
                            <p className="text-sm font-medium text-gray-900 mb-1">
                              Safety Assessment:
                            </p>
                            <p className="text-sm text-gray-700">{assessment.rationale}</p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 mb-3">
                          {dish.ingredients.map((ing, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-white text-gray-700 text-xs rounded-full border border-gray-300"
                            >
                              {ing}
                            </span>
                          ))}
                        </div>

                        {dish.allergens.length > 0 && (
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Allergens:</span> {dish.allergens.join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="ml-6 text-right">
                        <p className="text-2xl font-heading mb-4">£{dish.price.toFixed(2)}</p>
                        <button
                          disabled={assessment?.risk_classification === 'avoid'}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                            assessment?.risk_classification === 'avoid'
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-brand-text text-white hover:opacity-90'
                          }`}
                        >
                          <ShoppingBag className="w-4 h-4" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
