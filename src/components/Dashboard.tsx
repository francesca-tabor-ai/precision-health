import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { Heart, Activity, FileText, Utensils, Calendar, Pill, User, LogOut, Plus, ChefHat, Search, ShoppingCart, Store, Package, Syringe } from 'lucide-react';
import { RecipeBrowser } from './RecipeBrowser';
import { FoodLookup } from './FoodLookup';
import { RestaurantBrowser } from './RestaurantBrowser';
import { GroceryShopping } from './GroceryShopping';
import { MedicationTracker } from './MedicationTracker';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface DashboardProps {
  onSignOut: () => void;
}

type View = 'overview' | 'biomarkers' | 'nutrition' | 'recipes' | 'food-lookup' | 'meal-plans' | 'restaurants' | 'grocery' | 'medications' | 'supplements' | 'appointments' | 'profile';

export function Dashboard({ onSignOut }: DashboardProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('overview');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-text mx-auto mb-4"></div>
          <p className="font-light">Loading your health dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Heart className="w-8 h-8 text-brand-text" />
            <span className="font-heading text-2xl text-brand-text">PRECISION</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem
            icon={<Activity />}
            label="Overview"
            active={currentView === 'overview'}
            onClick={() => setCurrentView('overview')}
          />
          <NavItem
            icon={<FileText />}
            label="Biomarkers"
            active={currentView === 'biomarkers'}
            onClick={() => setCurrentView('biomarkers')}
          />
          <NavItem
            icon={<Utensils />}
            label="Nutrition"
            active={currentView === 'nutrition'}
            onClick={() => setCurrentView('nutrition')}
          />
          <NavItem
            icon={<ChefHat />}
            label="Recipes"
            active={currentView === 'recipes'}
            onClick={() => setCurrentView('recipes')}
          />
          <NavItem
            icon={<Search />}
            label="Food Lookup"
            active={currentView === 'food-lookup'}
            onClick={() => setCurrentView('food-lookup')}
          />
          <NavItem
            icon={<ShoppingCart />}
            label="Meal Plans"
            active={currentView === 'meal-plans'}
            onClick={() => setCurrentView('meal-plans')}
          />
          <NavItem
            icon={<Store />}
            label="Restaurants"
            active={currentView === 'restaurants'}
            onClick={() => setCurrentView('restaurants')}
          />
          <NavItem
            icon={<Package />}
            label="Grocery"
            active={currentView === 'grocery'}
            onClick={() => setCurrentView('grocery')}
          />
          <NavItem
            icon={<Syringe />}
            label="Medications"
            active={currentView === 'medications'}
            onClick={() => setCurrentView('medications')}
          />
          <NavItem
            icon={<Pill />}
            label="Supplements"
            active={currentView === 'supplements'}
            onClick={() => setCurrentView('supplements')}
          />
          <NavItem
            icon={<Calendar />}
            label="Appointments"
            active={currentView === 'appointments'}
            onClick={() => setCurrentView('appointments')}
          />
          <NavItem
            icon={<User />}
            label="Profile"
            active={currentView === 'profile'}
            onClick={() => setCurrentView('profile')}
          />
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onSignOut}
            className="w-full flex items-center space-x-2 px-4 py-2 text-sm font-medium text-brand-text hover:bg-brand-cream rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            {currentView === 'overview' && <OverviewView profile={profile} />}
            {currentView === 'biomarkers' && <BiomarkersView />}
            {currentView === 'nutrition' && <NutritionView />}
            {currentView === 'recipes' && <RecipeBrowser />}
            {currentView === 'food-lookup' && <FoodLookup />}
            {currentView === 'meal-plans' && <MealPlansView />}
            {currentView === 'restaurants' && <RestaurantBrowser />}
            {currentView === 'grocery' && <GroceryShopping />}
            {currentView === 'medications' && <MedicationTracker />}
            {currentView === 'supplements' && <SupplementsView />}
            {currentView === 'appointments' && <AppointmentsView />}
            {currentView === 'profile' && <ProfileView profile={profile} onProfileUpdate={loadProfile} />}
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
        active
          ? 'bg-brand-button-dark text-brand-text font-medium'
          : 'text-gray-600 hover:bg-brand-cream font-light'
      }`}
    >
      <span className="w-5 h-5">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function OverviewView({ profile }: { profile: Profile | null }) {
  return (
    <div>
      <h1 className="text-4xl font-heading mb-8">
        WELCOME BACK, {profile?.full_name.toUpperCase()}
      </h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={<FileText className="w-8 h-8" />}
          title="Biomarker Records"
          value="0"
          subtitle="Upload your first lab work"
        />
        <StatCard
          icon={<Activity className="w-8 h-8" />}
          title="Health Score"
          value="—"
          subtitle="Pending biomarker analysis"
        />
        <StatCard
          icon={<Utensils className="w-8 h-8" />}
          title="Active Meal Plans"
          value="0"
          subtitle="Get personalized recommendations"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <ActionCard
          icon={<FileText />}
          title="Upload Lab Work"
          description="Upload PDFs, photos, or manually enter biomarker data to get started with your precision health journey."
          buttonText="Upload Biomarkers"
          onClick={() => {}}
        />
        <ActionCard
          icon={<Utensils />}
          title="Nutrition Recommendations"
          description="Get personalized eat/avoid/caution lists based on your unique biomarker profile and health conditions."
          buttonText="View Nutrition Guide"
          onClick={() => {}}
        />
      </div>
    </div>
  );
}

function BiomarkersView() {
  const [records, setRecords] = useState<Database['public']['Tables']['biomarker_records']['Row'][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBiomarkers();
  }, []);

  const loadBiomarkers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('biomarker_records')
        .select('*')
        .order('test_date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error loading biomarkers:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-heading">BIOMARKERS</h1>
        <button className="flex items-center space-x-2 px-6 py-3 bg-brand-text text-white rounded-lg font-medium hover:opacity-90 transition-all">
          <Plus className="w-5 h-5" />
          <span>Upload Lab Work</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-text mx-auto mb-4"></div>
          <p className="font-light">Loading biomarker records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-2xl font-heading mb-2">NO BIOMARKER RECORDS YET</h3>
          <p className="font-light text-gray-600 mb-6">
            Upload your first lab work to start your precision health journey
          </p>
          <button className="px-6 py-3 bg-brand-text text-white rounded-lg font-medium hover:opacity-90 transition-all">
            Upload Lab Work
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <div key={record.id} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">Test Date</p>
                  <p className="text-lg font-medium">{new Date(record.test_date).toLocaleDateString()}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  record.risk_level === 'urgent' ? 'bg-red-100 text-red-700' :
                  record.risk_level === 'caution' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {record.risk_level.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NutritionView() {
  return (
    <div>
      <h1 className="text-4xl font-heading mb-8">NUTRITION RECOMMENDATIONS</h1>
      <div className="bg-white rounded-xl p-12 text-center shadow-sm">
        <Utensils className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-2xl font-heading mb-2">NUTRITION INSIGHTS COMING SOON</h3>
        <p className="font-light text-gray-600">
          Upload your biomarker data to receive personalized nutrition recommendations
        </p>
      </div>
    </div>
  );
}

function SupplementsView() {
  return (
    <div>
      <h1 className="text-4xl font-heading mb-8">SUPPLEMENT PROTOCOLS</h1>
      <div className="bg-white rounded-xl p-12 text-center shadow-sm">
        <Pill className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-2xl font-heading mb-2">SUPPLEMENT PROTOCOLS COMING SOON</h3>
        <p className="font-light text-gray-600">
          Upload your biomarker data to receive personalized supplement recommendations
        </p>
      </div>
    </div>
  );
}

function MealPlansView() {
  const [mealPlans, setMealPlans] = useState<Database['public']['Tables']['weekly_meal_plans']['Row'][]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMealPlans();
  }, []);

  const loadMealPlans = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('weekly_meal_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMealPlans(data || []);
    } catch (error) {
      console.error('Error loading meal plans:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-heading">MEAL PLANS</h1>
        <button className="flex items-center space-x-2 px-6 py-3 bg-brand-text text-white rounded-lg font-medium hover:opacity-90 transition-all">
          <Plus className="w-5 h-5" />
          <span>Generate Meal Plan</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-text mx-auto mb-4"></div>
          <p className="font-light">Loading meal plans...</p>
        </div>
      ) : mealPlans.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-2xl font-heading mb-2">NO MEAL PLANS YET</h3>
          <p className="font-light text-gray-600 mb-6">
            Generate your first personalized meal plan based on your biomarkers and health goals
          </p>
          <button className="px-6 py-3 bg-brand-text text-white rounded-lg font-medium hover:opacity-90 transition-all">
            Generate Meal Plan
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {mealPlans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-heading mb-1">{plan.plan_name}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(plan.start_date).toLocaleDateString()} - {new Date(plan.end_date).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  plan.status === 'active' ? 'bg-green-100 text-green-700' :
                  plan.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {plan.status.toUpperCase()}
                </span>
              </div>
              <button className="text-brand-text font-medium hover:underline">
                View Details
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AppointmentsView() {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-heading">APPOINTMENTS</h1>
        <button className="flex items-center space-x-2 px-6 py-3 bg-brand-text text-white rounded-lg font-medium hover:opacity-90 transition-all">
          <Plus className="w-5 h-5" />
          <span>Add Appointment</span>
        </button>
      </div>
      <div className="bg-white rounded-xl p-12 text-center shadow-sm">
        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-2xl font-heading mb-2">NO APPOINTMENTS SCHEDULED</h3>
        <p className="font-light text-gray-600">
          Track your GP, specialist, and veterinary appointments in one place
        </p>
      </div>
    </div>
  );
}

function ProfileView({ profile, onProfileUpdate }: { profile: Profile | null; onProfileUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth || '');
  const [weightKg, setWeightKg] = useState(profile?.weight_kg?.toString() || '');
  const [heightCm, setHeightCm] = useState(profile?.height_cm?.toString() || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          date_of_birth: dateOfBirth || null,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          height_cm: heightCm ? parseFloat(heightCm) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setEditing(false);
      onProfileUpdate();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-heading">PROFILE</h1>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-6 py-3 bg-brand-button-dark text-brand-text rounded-lg font-medium hover:bg-brand-button-medium transition-all"
          >
            Edit Profile
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl p-8 shadow-sm max-w-2xl">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={!editing}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-button-dark disabled:bg-gray-50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Date of Birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              disabled={!editing}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-button-dark disabled:bg-gray-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                disabled={!editing}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-button-dark disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Height (cm)</label>
              <input
                type="number"
                step="0.1"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                disabled={!editing}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-button-dark disabled:bg-gray-50"
              />
            </div>
          </div>

          {editing && (
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-brand-text text-white rounded-lg font-medium hover:opacity-90 transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setFullName(profile?.full_name || '');
                  setDateOfBirth(profile?.date_of_birth || '');
                  setWeightKg(profile?.weight_kg?.toString() || '');
                  setHeightCm(profile?.height_cm?.toString() || '');
                }}
                className="px-6 py-3 bg-brand-button-light text-brand-text rounded-lg font-medium hover:bg-brand-button-medium transition-all"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, subtitle }: { icon: React.ReactNode; title: string; value: string; subtitle: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center space-x-3 mb-4">
        <div className="text-brand-text">{icon}</div>
        <h3 className="font-medium">{title}</h3>
      </div>
      <p className="text-3xl font-heading mb-1">{value}</p>
      <p className="text-sm text-gray-500 font-light">{subtitle}</p>
    </div>
  );
}

function ActionCard({ icon, title, description, buttonText, onClick }: { icon: React.ReactNode; title: string; description: string; buttonText: string; onClick: () => void }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center space-x-3 mb-4">
        <div className="text-brand-text">{icon}</div>
        <h3 className="text-xl font-heading">{title}</h3>
      </div>
      <p className="font-light text-gray-600 mb-6">{description}</p>
      <button
        onClick={onClick}
        className="px-6 py-3 bg-brand-button-dark text-brand-text rounded-lg font-medium hover:bg-brand-button-medium transition-all"
      >
        {buttonText}
      </button>
    </div>
  );
}
