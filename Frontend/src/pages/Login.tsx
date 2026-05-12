import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, Sparkles, Activity, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { OcuSightLogo } from "@/components/OcuSightLogo";
import { toast } from "sonner";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mock login
    setTimeout(() => {
      setLoading(false);
      toast.success("Welcome back to OcuSight!");
      navigate("/dashboard");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex bg-ocusight-warm-bg relative overflow-hidden text-slate-800">
      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 z-0 opacity-50 pointer-events-none transition-transform duration-1000 ease-out"
        style={{
          background: `radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, rgba(234, 88, 12, 0.08) 0%, transparent 50%)`
        }}
      />
      
      {/* Decorative animated blobs */}
      <motion.div 
        animate={{ 
          x: [0, 50, -20, 0], 
          y: [0, -30, 40, 0],
          scale: [1, 1.1, 0.9, 1] 
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-orange-400/20 to-red-400/20 blur-[120px]"
      />
      <motion.div 
        animate={{ 
          x: [0, -40, 30, 0], 
          y: [0, 50, -20, 0],
          scale: [1, 1.2, 0.8, 1] 
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-10%] right-[-5%] w-[45%] h-[45%] rounded-full bg-gradient-to-tr from-rose-400/20 to-orange-300/20 blur-[100px]"
      />

      {/* Left panel - Feature showcase */}
      <div className="hidden lg:flex lg:w-5/12 relative z-10 flex-col justify-between p-12 lg:p-16 border-r border-white/50 bg-white/30 backdrop-blur-3xl shadow-[min(100px,20vw)_0_min(100px,20vw)_rgba(0,0,0,0.02)]">
        <div className="space-y-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-block"
          >
            <OcuSightLogo size="lg" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-6"
          >
            <h1 className="text-4xl xl:text-5xl font-heading font-extrabold tracking-tight text-slate-900 leading-[1.1]">
              Elevating <br/> Retinal Analysis <br/> with AI.
            </h1>
            <p className="text-slate-600 text-lg max-w-md leading-relaxed">
              Empower your clinical decisions with instant, highly accurate disease detection and severity assessment.
            </p>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="space-y-4"
        >
          {[
            { icon: Sparkles, text: "Advanced ML pattern recognition" },
            { icon: Activity, text: "Real-time severity assessment" },
            { icon: ShieldCheck, text: "HIPAA compliant data security" }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
              className="flex items-center gap-4 bg-white/60 border border-white p-4 rounded-2xl shadow-sm backdrop-blur-md hover:bg-white/80 transition-colors cursor-default"
            >
              <div className="p-2.5 rounded-xl bg-orange-100 text-orange-600 shadow-inner">
                <feature.icon size={20} />
              </div>
              <span className="font-semibold text-slate-700">{feature.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 z-10 relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
          className="w-full max-w-md relative"
        >
          {/* Subtle glow behind the card */}
          <div className="absolute -inset-1.5 rounded-[2rem] bg-gradient-to-b from-orange-500/20 to-red-500/20 blur-xl opacity-60 pointer-events-none" />
          
          <Card className="relative bg-white/80 border-white/60 shadow-2xl backdrop-blur-2xl overflow-hidden rounded-[2rem]">
            {/* Top highlight border */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
            
            <CardContent className="p-8 sm:p-10">
              <div className="space-y-3 mb-10 text-center lg:text-left">
                <div className="lg:hidden flex justify-center mb-8">
                  <OcuSightLogo size="lg" />
                </div>
                <h2 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">Welcome back</h2>
                <p className="text-slate-500 text-sm font-medium">Enter your credentials to access the portal</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2.5 group">
                  <Label htmlFor="email" className="text-slate-700 font-semibold ml-1 text-sm">Email Address</Label>
                  <div className="relative overflow-hidden rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="doctor@ocusight.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11 h-12 bg-white/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-orange-500/30 focus-visible:border-orange-500 transition-all font-medium"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2.5 group">
                  <div className="flex items-center justify-between ml-1">
                    <Label htmlFor="password" className="text-slate-700 font-semibold text-sm">Password</Label>
                    <Link to="/forgot-password" className="text-xs font-semibold text-orange-600 hover:text-orange-500 transition-colors">
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative overflow-hidden rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 pr-12 h-12 bg-white/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-orange-500/30 focus-visible:border-orange-500 transition-all font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 mt-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 shadow-[0_8px_16px_-6px_rgba(234,88,12,0.4)] rounded-xl font-semibold text-[15px] transition-all hover:shadow-[0_12px_20px_-6px_rgba(234,88,12,0.5)] hover:-translate-y-0.5 active:translate-y-0" 
                  disabled={loading}
                >
                  <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Authenticating...
                      </motion.div>
                    ) : (
                      <motion.div
                        key="text"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center gap-2 w-full h-full"
                      >
                        Sign In <ArrowRight className="w-4 h-4 ml-1" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </form>
            </CardContent>
          </Card>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 text-center"
          >
            <div className="inline-flex items-center justify-center gap-4 bg-white/40 border border-white/60 rounded-2xl p-4 backdrop-blur-md w-full shadow-sm hover:bg-white/50 transition-colors">
              <div className="p-2.5 bg-orange-100/80 rounded-xl text-orange-600 shadow-inner">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="text-left flex-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Demo Access</p>
                <div className="flex gap-4 text-sm">
                  <p className="text-slate-600 font-medium">User: <span className="text-slate-900 font-mono font-bold bg-white/50 px-1.5 py-0.5 rounded">demo@ocusight.com</span></p>
                  <p className="text-slate-600 font-medium">Pass: <span className="text-slate-900 font-mono font-bold bg-white/50 px-1.5 py-0.5 rounded">demo1234</span></p>
                </div>
              </div>
            </div>
            
            <p className="mt-8 text-sm font-medium text-slate-500">
              Don't have an account?{" "}
              <Link to="/register" className="text-orange-600 font-bold hover:text-orange-700 transition-colors hover:underline underline-offset-4">
                Request Access
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
