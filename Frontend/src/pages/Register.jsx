import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";

// Fallback prevents "undefined/api/..." error
const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL || "http://localhost:5000";

export const Register = ({ setUser }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Your User.js model requires an 'id' string
      const payload = {
        ...formData,
        id: crypto.randomUUID() 
      };

      const { data } = await axios.post(`${BACKEND_URL}/api/auth/register`, payload);

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      setUser(data.user);
      toast.success("Account created successfully!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8">
        <header className="text-center">
          <BookOpen className="w-12 h-12 mx-auto text-primary mb-4" />
          <h1 className="text-3xl font-bold">Join Study Hub</h1>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="John Doe" onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="john@example.com" onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" onChange={handleChange} required />
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl" disabled={loading}>
            {loading ? "Registering..." : "Create Account"}
          </Button>
        </form>
        <p className="text-center text-sm">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
};