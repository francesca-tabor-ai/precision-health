import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';

interface LookupResult {
  food_name: string;
  safety_classification: 'safe' | 'caution' | 'avoid';
  rationale: string;
  ingredients_identified: string[];
}

export function FoodLookup() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [recentLookups, setRecentLookups] = useState<LookupResult[]>([]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const { data: ingredientData } = await supabase
        .from('ingredients')
        .select('*, species_safe, toxicity_warnings')
        .ilike('name', `%${searchQuery}%`)
        .limit(1)
        .maybeSingle();

      let classification: 'safe' | 'caution' | 'avoid' = 'safe';
      let rationale = 'This food appears to be generally safe for consumption.';
      const ingredients: string[] = [];

      if (ingredientData) {
        ingredients.push(ingredientData.name);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('species_type')
            .eq('id', user.id)
            .maybeSingle();

          const speciesType = profile?.species_type || 'human';

          if (ingredientData.toxicity_warnings && ingredientData.toxicity_warnings.length > 0) {
            const toxicForSpecies = ingredientData.toxicity_warnings.find(
              (warning: any) => warning.species?.includes(speciesType)
            );

            if (toxicForSpecies) {
              classification = 'avoid';
              rationale = `DANGER: ${ingredientData.name} is toxic to ${speciesType}s. ${toxicForSpecies.effect || 'Can cause serious health issues.'}`;
            }
          }

          if (classification === 'safe' && ingredientData.species_safe) {
            const isSafe = ingredientData.species_safe[speciesType];
            if (isSafe === false) {
              classification = 'avoid';
              rationale = `${ingredientData.name} is not safe for ${speciesType} consumption.`;
            }
          }

          const { data: contraindications } = await supabase
            .from('ingredient_contraindications')
            .select('*')
            .eq('ingredient_id', ingredientData.id)
            .eq('species_type', speciesType);

          if (contraindications && contraindications.length > 0) {
            const avoidConditions = contraindications.filter(c => c.contraindication_type === 'avoid');
            const cautionConditions = contraindications.filter(c => c.contraindication_type === 'caution' || c.contraindication_type === 'limit');

            if (avoidConditions.length > 0) {
              classification = 'caution';
              rationale = `Use caution: ${ingredientData.name} should be avoided if you have ${avoidConditions.map(c => c.condition_name).join(', ')}.`;
            } else if (cautionConditions.length > 0) {
              classification = 'caution';
              rationale = `Monitor intake: ${ingredientData.name} should be limited if you have ${cautionConditions.map(c => c.condition_name).join(', ')}.`;
            }
          }
        }
      } else {
        classification = 'caution';
        rationale = 'This food is not in our database yet. Please consult with a healthcare professional if you have specific dietary concerns.';
      }

      const lookupResult: LookupResult = {
        food_name: searchQuery,
        safety_classification: classification,
        rationale,
        ingredients_identified: ingredients,
      };

      setResult(lookupResult);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('food_lookup_history').insert({
          profile_id: user.id,
          food_name: searchQuery,
          safety_classification: classification,
          rationale,
          ingredients_identified: ingredients,
        });

        loadRecentLookups();
      }
    } catch (error) {
      console.error('Error looking up food:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentLookups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('food_lookup_history')
        .select('*')
        .order('lookup_date', { ascending: false })
        .limit(5);

      if (data) {
        setRecentLookups(data);
      }
    } catch (error) {
      console.error('Error loading recent lookups:', error);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-heading mb-2">FOOD SAFETY LOOKUP</h1>
        <p className="font-light text-gray-600">
          Check if a food is safe for you or your pet based on your health profile
        </p>
      </div>

      <div className="bg-white rounded-xl p-8 shadow-sm mb-8">
        <form onSubmit={handleLookup} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter food name (e.g., onion, salmon, blueberries)..."
              className="w-full pl-10 pr-4 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-button-dark text-lg"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !searchQuery.trim()}
            className="w-full px-6 py-4 bg-brand-text text-white rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Analyzing...' : 'Check Food Safety'}
          </button>
        </form>

        {result && (
          <div className="mt-8 p-6 rounded-lg border-2" style={{
            borderColor: result.safety_classification === 'safe' ? '#10b981' :
                        result.safety_classification === 'caution' ? '#f59e0b' : '#ef4444',
            backgroundColor: result.safety_classification === 'safe' ? '#f0fdf4' :
                            result.safety_classification === 'caution' ? '#fffbeb' : '#fef2f2'
          }}>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {result.safety_classification === 'safe' && <CheckCircle className="w-8 h-8 text-green-600" />}
                {result.safety_classification === 'caution' && <AlertCircle className="w-8 h-8 text-yellow-600" />}
                {result.safety_classification === 'avoid' && <XCircle className="w-8 h-8 text-red-600" />}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-heading mb-2" style={{
                  color: result.safety_classification === 'safe' ? '#065f46' :
                         result.safety_classification === 'caution' ? '#92400e' : '#991b1b'
                }}>
                  {result.safety_classification === 'safe' && 'SAFE'}
                  {result.safety_classification === 'caution' && 'USE CAUTION'}
                  {result.safety_classification === 'avoid' && 'AVOID'}
                </h3>
                <p className="font-light text-gray-700 mb-4">{result.rationale}</p>
                {result.ingredients_identified.length > 0 && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Info className="w-4 h-4" />
                    <span className="font-medium">Identified ingredients:</span>
                    <span>{result.ingredients_identified.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {recentLookups.length > 0 && (
        <div className="bg-white rounded-xl p-8 shadow-sm">
          <h2 className="text-2xl font-heading mb-4">RECENT LOOKUPS</h2>
          <div className="space-y-3">
            {recentLookups.map((lookup, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-brand-cream rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {lookup.safety_classification === 'safe' && <CheckCircle className="w-5 h-5 text-green-600" />}
                  {lookup.safety_classification === 'caution' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                  {lookup.safety_classification === 'avoid' && <XCircle className="w-5 h-5 text-red-600" />}
                  <span className="font-medium">{lookup.food_name}</span>
                </div>
                <span className="text-sm text-gray-500 capitalize">{lookup.safety_classification}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
