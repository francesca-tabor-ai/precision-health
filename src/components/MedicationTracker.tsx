import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Pill, Plus, Clock, AlertTriangle, CheckCircle, Calendar, TrendingUp, X } from 'lucide-react';

interface Medication {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  schedule_times: string[];
  start_date: string;
  end_date: string | null;
  reason: string;
  prescribing_provider: string;
  special_instructions: string;
  active: boolean;
}

interface MedicationDose {
  id: string;
  user_medication_id: string;
  scheduled_time: string;
  taken_time: string | null;
  status: 'scheduled' | 'taken' | 'missed' | 'skipped';
}

interface InteractionAlert {
  id: string;
  severity: string;
  message: string;
  recommendation: string;
  acknowledged: boolean;
}

export function MedicationTracker() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todaysDoses, setTodaysDoses] = useState<(MedicationDose & { medication_name: string })[]>([]);
  const [interactionAlerts, setInteractionAlerts] = useState<InteractionAlert[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newMedication, setNewMedication] = useState({
    medication_name: '',
    dosage: '',
    frequency: 'once_daily',
    schedule_times: ['08:00'],
    start_date: new Date().toISOString().split('T')[0],
    reason: '',
    prescribing_provider: '',
    special_instructions: '',
  });

  useEffect(() => {
    loadMedications();
    loadTodaysDoses();
    loadInteractionAlerts();
  }, []);

  const loadMedications = async () => {
    try {
      const { data, error } = await supabase
        .from('user_medications')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMedications(data || []);
    } catch (error) {
      console.error('Error loading medications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodaysDoses = async () => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const { data: doses, error } = await supabase
        .from('medication_doses')
        .select('*, user_medications(medication_name)')
        .gte('scheduled_time', startOfDay)
        .lte('scheduled_time', endOfDay)
        .order('scheduled_time');

      if (error) throw error;

      const formattedDoses = (doses || []).map((dose: any) => ({
        ...dose,
        medication_name: dose.user_medications?.medication_name || 'Unknown',
      }));

      setTodaysDoses(formattedDoses);
    } catch (error) {
      console.error('Error loading doses:', error);
    }
  };

  const loadInteractionAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('user_interaction_alerts')
        .select('*')
        .eq('acknowledged', false)
        .order('severity', { ascending: false });

      if (error) throw error;
      setInteractionAlerts(data || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const addMedication = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('user_medications').insert({
        profile_id: user.id,
        ...newMedication,
        active: true,
      });

      if (error) throw error;

      await generateDoseSchedule(user.id);

      setShowAddForm(false);
      setNewMedication({
        medication_name: '',
        dosage: '',
        frequency: 'once_daily',
        schedule_times: ['08:00'],
        start_date: new Date().toISOString().split('T')[0],
        reason: '',
        prescribing_provider: '',
        special_instructions: '',
      });

      loadMedications();
      loadInteractionAlerts();
    } catch (error) {
      console.error('Error adding medication:', error);
      alert('Failed to add medication');
    }
  };

  const generateDoseSchedule = async (userId: string) => {
    try {
      const { data: userMeds } = await supabase
        .from('user_medications')
        .select('*')
        .eq('profile_id', userId)
        .eq('active', true);

      if (!userMeds) return;

      for (const med of userMeds) {
        const doses = [];
        const startDate = new Date(med.start_date);
        const endDate = med.end_date ? new Date(med.end_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
          for (const time of med.schedule_times) {
            const [hours, minutes] = time.split(':');
            const scheduledTime = new Date(date);
            scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            doses.push({
              user_medication_id: med.id,
              profile_id: userId,
              scheduled_time: scheduledTime.toISOString(),
              status: 'scheduled',
            });
          }
        }

        await supabase.from('medication_doses').insert(doses);
      }
    } catch (error) {
      console.error('Error generating dose schedule:', error);
    }
  };

  const markDoseTaken = async (doseId: string) => {
    try {
      const { error } = await supabase
        .from('medication_doses')
        .update({
          status: 'taken',
          taken_time: new Date().toISOString(),
        })
        .eq('id', doseId);

      if (error) throw error;
      loadTodaysDoses();
    } catch (error) {
      console.error('Error marking dose taken:', error);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('user_interaction_alerts')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
      loadInteractionAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe':
      case 'major':
        return 'border-red-500 bg-red-50';
      case 'moderate':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-blue-500 bg-blue-50';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-text mx-auto mb-4"></div>
        <p className="font-light">Loading medications...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-heading">MEDICATION TRACKER</h1>
          <p className="font-light text-gray-600 mt-2">
            Manage medications and track adherence
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 px-6 py-3 bg-brand-text text-white rounded-lg font-medium hover:opacity-90 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Add Medication</span>
        </button>
      </div>

      {interactionAlerts.length > 0 && (
        <div className="mb-8 space-y-4">
          <h2 className="text-2xl font-heading flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <span>INTERACTION ALERTS</span>
          </h2>
          {interactionAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`border-2 rounded-xl p-6 ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="px-3 py-1 bg-white rounded-full text-sm font-medium uppercase">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-lg font-medium mb-2">{alert.message}</p>
                  <p className="text-gray-700 mb-4">{alert.recommendation}</p>
                </div>
                <button
                  onClick={() => acknowledgeAlert(alert.id)}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-2 mb-6">
            <Clock className="w-6 h-6 text-brand-text" />
            <h2 className="text-2xl font-heading">TODAY'S SCHEDULE</h2>
          </div>

          {todaysDoses.length === 0 ? (
            <p className="text-gray-500 font-light text-center py-8">
              No doses scheduled for today
            </p>
          ) : (
            <div className="space-y-3">
              {todaysDoses.map((dose) => (
                <div
                  key={dose.id}
                  className={`p-4 rounded-lg border-2 ${
                    dose.status === 'taken'
                      ? 'border-green-300 bg-green-50'
                      : dose.status === 'missed'
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{dose.medication_name}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(dose.scheduled_time).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {dose.status === 'scheduled' && (
                      <button
                        onClick={() => markDoseTaken(dose.id)}
                        className="px-4 py-2 bg-brand-text text-white rounded-lg font-medium hover:opacity-90"
                      >
                        Mark Taken
                      </button>
                    )}
                    {dose.status === 'taken' && (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Taken</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp className="w-6 h-6 text-brand-text" />
            <h2 className="text-2xl font-heading">ADHERENCE</h2>
          </div>

          <div className="text-center py-8">
            <div className="text-6xl font-heading text-brand-text mb-2">
              {todaysDoses.length > 0
                ? Math.round((todaysDoses.filter((d) => d.status === 'taken').length / todaysDoses.length) * 100)
                : 0}
              %
            </div>
            <p className="text-gray-600">Today's Adherence</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-2xl font-heading mb-6">ACTIVE MEDICATIONS</h2>

        {medications.length === 0 ? (
          <p className="text-gray-500 font-light text-center py-8">
            No active medications. Add your first medication above.
          </p>
        ) : (
          <div className="space-y-4">
            {medications.map((med) => (
              <div key={med.id} className="border border-gray-300 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-heading mb-1">{med.medication_name}</h3>
                    <p className="text-gray-600">
                      {med.dosage} - {med.frequency}
                    </p>
                  </div>
                  <Pill className="w-6 h-6 text-brand-text" />
                </div>

                {med.reason && (
                  <div className="mb-3">
                    <span className="font-medium">Reason:</span>
                    <span className="text-gray-700 ml-2">{med.reason}</span>
                  </div>
                )}

                {med.prescribing_provider && (
                  <div className="mb-3">
                    <span className="font-medium">Prescribed by:</span>
                    <span className="text-gray-700 ml-2">{med.prescribing_provider}</span>
                  </div>
                )}

                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Started {new Date(med.start_date).toLocaleDateString()}</span>
                  </div>
                  {med.schedule_times && med.schedule_times.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{med.schedule_times.join(', ')}</span>
                    </div>
                  )}
                </div>

                {med.special_instructions && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-700">{med.special_instructions}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-heading mb-6">ADD MEDICATION</h2>

            <form onSubmit={addMedication} className="space-y-4">
              <div>
                <label className="block font-medium mb-2">Medication Name</label>
                <input
                  type="text"
                  value={newMedication.medication_name}
                  onChange={(e) =>
                    setNewMedication({ ...newMedication, medication_name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-button-dark"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-2">Dosage</label>
                  <input
                    type="text"
                    value={newMedication.dosage}
                    onChange={(e) => setNewMedication({ ...newMedication, dosage: e.target.value })}
                    required
                    placeholder="e.g., 50mg"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-button-dark"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2">Frequency</label>
                  <select
                    value={newMedication.frequency}
                    onChange={(e) => setNewMedication({ ...newMedication, frequency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-button-dark"
                  >
                    <option value="once_daily">Once Daily</option>
                    <option value="twice_daily">Twice Daily</option>
                    <option value="three_times_daily">Three Times Daily</option>
                    <option value="as_needed">As Needed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-2">Start Date</label>
                <input
                  type="date"
                  value={newMedication.start_date}
                  onChange={(e) => setNewMedication({ ...newMedication, start_date: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-button-dark"
                />
              </div>

              <div>
                <label className="block font-medium mb-2">Reason</label>
                <input
                  type="text"
                  value={newMedication.reason}
                  onChange={(e) => setNewMedication({ ...newMedication, reason: e.target.value })}
                  placeholder="e.g., High blood pressure"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-button-dark"
                />
              </div>

              <div>
                <label className="block font-medium mb-2">Prescribing Provider</label>
                <input
                  type="text"
                  value={newMedication.prescribing_provider}
                  onChange={(e) =>
                    setNewMedication({ ...newMedication, prescribing_provider: e.target.value })
                  }
                  placeholder="e.g., Dr. Smith"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-button-dark"
                />
              </div>

              <div>
                <label className="block font-medium mb-2">Special Instructions</label>
                <textarea
                  value={newMedication.special_instructions}
                  onChange={(e) =>
                    setNewMedication({ ...newMedication, special_instructions: e.target.value })
                  }
                  rows={3}
                  placeholder="e.g., Take with food"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-button-dark"
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-brand-text text-white rounded-lg font-medium hover:opacity-90"
                >
                  Add Medication
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
