import "./App.css"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { Login } from "./pages/Login"
import { Register } from "./pages/Register"
import { Dashboard } from "./pages/Dashboard"
import { Upload } from "./pages/Upload"
import { MaterialDetail } from "./pages/MaterialDetail"
import { Toaster } from "./components/ui/sonner"

export const App = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedUser = localStorage.getItem("user")
    const token = localStorage.getItem("token")
    
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (err) {
        localStorage.clear()
      }
    }
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const Protected = ({ children }) => user ? children : <Navigate to="/login" replace />

  return (
    <div className="App min-h-screen bg-background">
      <BrowserRouter>
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" replace /> : <Login setUser={setUser} />} 
          />
          <Route 
            path="/register" 
            element={user ? <Navigate to="/dashboard" replace /> : <Register setUser={setUser} />} 
          />
          
          <Route path="/dashboard" element={<Protected><Dashboard user={user} setUser={setUser} /></Protected>} />
          <Route path="/upload" element={<Protected><Upload user={user} /></Protected>} />
          <Route path="/material/:id" element={<Protected><MaterialDetail user={user} /></Protected>} />
          
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </div>
  )
}