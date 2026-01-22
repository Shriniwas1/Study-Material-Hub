import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";

// Ensure this matches your .env or defaults to 5000
const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL || "http://localhost:5000";

export const Login = ({ setUser }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/auth/login`, formData);

      // Store token and user data
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      setUser(data.user);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      // Improved error feedback
      const errorMsg = err.response?.data?.error || "Login failed. Check your connection.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8">
        <header className="text-center">
          <BookOpen className="w-12 h-12 mx-auto text-primary mb-4" />
          <h1 className="text-3xl font-bold">Sign In</h1>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="student@university.edu" onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" onChange={handleChange} required />
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </Button>
        </form>
        <p className="text-center text-sm">
          New here? <Link to="/register" className="text-primary hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
};