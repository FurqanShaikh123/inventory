import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle,
  TrendingUp,
  Package,
  AlertTriangle,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import heroImage from "@/assets/hero-inventory.jpg";

const Index = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // For demo purposes, just close the modal and redirect
    setIsLoginOpen(false);
    window.location.href = '/dashboard';
  };

  const AuthModal = () => (
    <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</DialogTitle>
          <DialogDescription>
            {authMode === 'login'
              ? 'Sign in to your inventory management account'
              : 'Create a new account to get started'
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleLogin} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
            />
          </div>
          {authMode === 'signup' && (
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
              />
            </div>
          )}
          <Button type="submit" className="w-full">
            {authMode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
          >
            {authMode === 'login'
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"
            }
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">Inventory Predictor</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button onClick={() => setIsLoginOpen(true)}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-5" />
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                  Predict Stock{" "}
                  <span className="text-primary">Depletion</span>{" "}
                  Before It Happens
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Stop losing revenue from stockouts and reduce costs from overstocking.
                  Our AI-powered system predicts when you'll run out of inventory and
                  automatically generates smart restock reminders.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="group"
                  asChild
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  <Link to="/dashboard?mode=demo">
                    Try Demo Dashboard
                    <ArrowRight className={`ml-2 h-5 w-5 transition-transform ${isHovered ? 'translate-x-1' : ''}`} />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setIsLoginOpen(true)}
                >
                  Watch Demo
                </Button>
              </div>

              <div className="flex items-center gap-8 pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-sm">No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-sm">Setup in 5 minutes</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-primary rounded-3xl blur-3xl opacity-20" />
              <img
                src={heroImage}
                alt="Inventory Management Dashboard"
                className="relative rounded-2xl shadow-2xl w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Stop Playing Guessing Games With Your Inventory
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform your manual processes into intelligent, automated inventory management
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="p-3 rounded-lg bg-primary-light w-fit mb-3">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Smart Predictions</CardTitle>
                <CardDescription>
                  AI-powered forecasting using Moving Average, Exponential Smoothing, and ARIMA algorithms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Accurate depletion predictions
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Sales velocity calculations
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Seasonal trend analysis
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="p-3 rounded-lg bg-warning-light w-fit mb-3">
                  <Bell className="h-6 w-6 text-warning" />
                </div>
                <CardTitle>Intelligent Alerts</CardTitle>
                <CardDescription>
                  Get notified before stockouts happen with smart categorization and automated reminders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Email & in-app notifications
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Color-coded stock levels
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Custom alert thresholds
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="p-3 rounded-lg bg-success-light w-fit mb-3">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
                <CardTitle>Visual Dashboard</CardTitle>
                <CardDescription>
                  Beautiful charts and trends that make inventory management intuitive and actionable
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Interactive charts & graphs
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Search & filter tools
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Export & reporting
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                The Hidden Costs of Manual Inventory Management
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-critical-light">
                    <AlertTriangle className="h-5 w-5 text-critical" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Lost Revenue from Stockouts</h3>
                    <p className="text-muted-foreground">
                      When products sell out unexpectedly, you lose sales and disappoint customers.
                      Studies show stockouts can reduce sales by 15-25%.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-warning-light">
                    <Package className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Excess Inventory Costs</h3>
                    <p className="text-muted-foreground">
                      Overstocking ties up capital and increases storage costs. Poor inventory
                      decisions can waste 20-30% of your working capital.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-muted">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Time-Consuming Manual Processes</h3>
                    <p className="text-muted-foreground">
                      Spreadsheets and manual tracking consume hours of valuable time that
                      could be spent growing your business.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-6 rounded-xl bg-gradient-success text-success-foreground">
                <h3 className="text-xl font-bold mb-3">Our Solution</h3>
                <p className="opacity-90">
                  Inventory Restock Predictor transforms your historical sales data into
                  intelligent predictions, helping you make data-driven restocking decisions
                  that optimize both availability and costs.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-card border border-border">
                  <div className="text-2xl font-bold text-primary mb-1">85%</div>
                  <div className="text-sm text-muted-foreground">Reduction in stockouts</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-card border border-border">
                  <div className="text-2xl font-bold text-success mb-1">30%</div>
                  <div className="text-sm text-muted-foreground">Less excess inventory</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Ready to Transform Your Inventory Management?
          </h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join hundreds of businesses that have eliminated stockouts and reduced inventory costs
            with intelligent predictions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/dashboard?mode=demo">
                Try Live Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              onClick={() => setIsLoginOpen(true)}
            >
              Schedule Demo Call
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border bg-card">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              <span className="font-semibold">Inventory Predictor</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Inventory Predictor. Intelligent inventory management.
            </p>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal />
    </div>
  );
};

export default Index;
