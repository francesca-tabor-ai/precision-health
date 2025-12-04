import { Activity, Brain, Calendar, FileText, Heart, Pill, Shield, TrendingUp, Users, Utensils } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Heart className="w-8 h-8 text-brand-text" />
              <span className="font-heading text-2xl text-brand-text">PRECISION NUTRITION</span>
            </div>
            <button
              onClick={onGetStarted}
              className="px-6 py-2 bg-brand-button-dark text-brand-text rounded-lg font-medium transition-all hover:bg-brand-button-medium hover:shadow-lg"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      <section className="relative min-h-[600px] md:min-h-[700px] flex items-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1600&q=80)',
          }}
        >
          <div className="absolute inset-0 bg-brand-text/70"></div>
        </div>

        <div className="relative z-10 w-full px-4 py-20">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl md:text-7xl font-heading mb-6 leading-tight text-white">
                YOUR BIOMARKERS.<br />YOUR NUTRITION.<br />YOUR HEALTH.
              </h1>
              <p className="text-xl md:text-2xl font-light mb-8 leading-relaxed text-white/90">
                A unified intelligence system that transforms lab work into personalized nutrition,
                predicts health risks, and delivers medical-grade care for you and your pets.
              </p>
              <button
                onClick={onGetStarted}
                className="px-8 py-4 bg-white text-brand-text rounded-lg text-lg font-semibold transition-all hover:bg-brand-cream hover:shadow-2xl"
              >
                Start Your Precision Nutrition Journey
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-heading text-center mb-16">
            BEYOND TRADITIONAL HEALTHCARE
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<FileText className="w-12 h-12" />}
              title="Lab Work Intelligence"
              description="Upload PDFs, photos, or integrate directly with labs. Advanced OCR and AI convert raw data into structured biomarker profiles with risk stratification."
            />
            <FeatureCard
              icon={<Brain className="w-12 h-12" />}
              title="Predictive Analytics"
              description="Probabilistic modeling identifies underlying conditions, anticipates disease risk, and forecasts biomarker shifts before symptoms appear."
            />
            <FeatureCard
              icon={<Utensils className="w-12 h-12" />}
              title="Precision Nutrition"
              description="Personalized eat/avoid/caution lists, condition-safe meal plans, and supplement protocols tailored to your unique biomarker profile."
            />
            <FeatureCard
              icon={<Shield className="w-12 h-12" />}
              title="Medical-Grade Safety"
              description="Regulatory-aware safety layer with medical oversight, drug interactions, and species-specific metabolic rules for pets."
            />
            <FeatureCard
              icon={<Activity className="w-12 h-12" />}
              title="Lifestyle Intelligence"
              description="Track meals, symptoms, sleep, exercise, and adherence. AI learns patterns to optimize recommendations and predict outcomes."
            />
            <FeatureCard
              icon={<TrendingUp className="w-12 h-12" />}
              title="Continuous Monitoring"
              description="Real-time trend analysis, early warning systems, and predictive models that evolve with your health journey."
            />
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-heading text-center mb-16">
            COMPREHENSIVE HEALTH ECOSYSTEM
          </h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-3xl font-heading">FOR HUMANS</h3>
              <ul className="space-y-4">
                <ListItem icon={<Heart />} text="Biomarker interpretation and risk assessment" />
                <ListItem icon={<Utensils />} text="Personalized recipes and meal plans" />
                <ListItem icon={<Pill />} text="Supplement protocols with safety checks" />
                <ListItem icon={<Calendar />} text="Appointment and medication management" />
                <ListItem icon={<TrendingUp />} text="Predictive health monitoring" />
              </ul>
            </div>
            <div className="space-y-6">
              <h3 className="text-3xl font-heading">FOR PETS</h3>
              <ul className="space-y-4">
                <ListItem icon={<Heart />} text="Species-specific biomarker analysis" />
                <ListItem icon={<Utensils />} text="Condition-safe nutrition (CKD, pancreatitis)" />
                <ListItem icon={<Shield />} text="Food safety thresholds and toxicity alerts" />
                <ListItem icon={<Calendar />} text="Veterinary appointment coordination" />
                <ListItem icon={<Activity />} text="Behavioral and symptom tracking" />
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-heading text-center mb-16">
            CLINICAL ENABLEMENT
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <ClinicalCard
              icon={<Users />}
              title="Professional Portal"
              description="Decision support tools for GPs, specialists, and veterinarians with biomarker trend analysis and population-level insights."
            />
            <ClinicalCard
              icon={<Brain />}
              title="Research Infrastructure"
              description="Longitudinal data insights and federated learning that reinforces clinical safety while protecting privacy."
            />
            <ClinicalCard
              icon={<Activity />}
              title="Care Coordination"
              description="At-home phlebotomy, IV therapy, and medical meal delivery bridging digital recommendations with real-world care."
            />
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-heading mb-8">
            READY TO TRANSFORM YOUR HEALTH?
          </h2>
          <p className="text-xl mb-8 font-light">
            Join the most comprehensive precision nutrition platform for humans and pets.
          </p>
          <button
            onClick={onGetStarted}
            className="px-8 py-4 bg-brand-text text-white rounded-lg text-lg font-semibold transition-all hover:opacity-90 hover:shadow-xl"
          >
            Get Started Today
          </button>
        </div>
      </section>

      <footer className="bg-white py-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <Heart className="w-6 h-6 text-brand-text" />
              <span className="font-heading text-xl text-brand-text">PRECISION NUTRITION</span>
            </div>
            <p className="text-sm font-light">
              Medical-grade diagnostics, nutrition science, and predictive AI for comprehensive health management.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-8 rounded-xl bg-white shadow-sm hover:shadow-lg transition-all border border-gray-100">
      <div className="text-brand-text mb-4">{icon}</div>
      <h3 className="text-2xl font-heading mb-3">{title}</h3>
      <p className="font-light leading-relaxed">{description}</p>
    </div>
  );
}

function ClinicalCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-8 rounded-xl border-2 border-brand-button-dark hover:border-brand-button-medium transition-all">
      <div className="text-brand-text mb-4">{icon}</div>
      <h3 className="text-2xl font-heading mb-3">{title}</h3>
      <p className="font-light leading-relaxed">{description}</p>
    </div>
  );
}

function ListItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start space-x-3">
      <div className="text-brand-text mt-1 flex-shrink-0">{icon}</div>
      <span className="font-light">{text}</span>
    </li>
  );
}
