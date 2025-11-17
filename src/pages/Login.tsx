import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthService } from "../services/auth.service";

type LoginMethod = "email" | "phone";

export default function Login() {
  const [method, setMethod] = useState<LoginMethod>("email");
  const [credentials, setCredentials] = useState({ email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (field: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (method === "email") {
        if (!credentials.email) {
          setError("Email is required");
          return;
        }
        await AuthService.signInWithEmail({
          email: credentials.email,
          password: credentials.password,
        });
      } else {
        if (!credentials.phone) {
          setError("Phone number is required");
          return;
        }
        await AuthService.signInWithPhone({
          phone: credentials.phone,
          password: credentials.password,
        });
      }

      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Sign In</h2>

        {/* Toggle login method */}
        <div className="flex gap-2 mb-6">
          {["email", "phone"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m as LoginMethod)}
              className={`flex-1 py-2 px-4 rounded font-medium transition-colors ${
                method === m
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {method === "email" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={credentials.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="you@example.com"
                className="w-full border rounded px-3 py-2"
              />
            </div>
          )}

          {method === "phone" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={credentials.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+220 1234567"
                className="w-full border rounded px-3 py-2"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder="••••••••"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-blue-600 hover:text-blue-800 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
