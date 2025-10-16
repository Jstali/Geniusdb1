import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Predefined credentials
  const validCredentials = [
    { username: "admin", password: "admin123" },
    { username: "hr", password: "hr123" },
    { username: "manager", password: "luffy123" },
    { username: "employee", password: "test123" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Basic validation
    if (!username || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      // Check credentials against predefined list
      const isValid = validCredentials.some(
        (cred) => cred.username === username && cred.password === password
      );

      if (!isValid) {
        throw new Error("Invalid username or password");
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("Login successful for user:", username);

      // Redirect to dashboard on successful login
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{backgroundColor: '#F6F2F4'}}>
      <div className="max-w-6xl w-full flex items-center">
        {/* Left Side - Logo (Outside the box) */}
        <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center pr-12">
          <div className="text-center">
            <img 
              src="/geniusdb logo.png" 
              alt="GeniusDB - Intelligent Grid Data" 
              className="w-96 h-auto mx-auto object-contain"
              style={{ width: '400px', height: 'auto' }}
            />
          </div>
        </div>
        
        {/* Right Side - Login Form Box */}
        <div className="w-full md:w-1/2">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="max-w-md mx-auto">
              {/* Mobile Logo - Only visible on small screens */}
              <div className="md:hidden text-center  mb-8">
                <img 
                  src="/geniusdb logo.png" 
                  alt="GeniusDB - Intelligent Grid Data" 
                  className="w-80 h-auto mx-auto object-contain"
                  style={{ width: '320px', height: 'auto' }}
                />
              </div>
              
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Sign In
                </h2>
                <p className="text-sm text-gray-600">
                  Enter your credentials to access your account
                </p>
              </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {error}
                  </h3>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Username or Email
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                style={{
                  backgroundColor: 'white',
                  color: '#030304',
                  border: '1px solid #E8E4E6'
                }}
                placeholder="Enter your username or email"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                style={{
                  backgroundColor: 'white',
                  color: '#030304',
                  border: '1px solid #E8E4E6'
                }}
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Log In'
              )}
            </button>
          </div>

          <div className="text-center">
            <a
              href="#"
              className="text-sm text-blue-600 hover:text-blue-500 underline"
            >
              Forgot Password?
            </a>
          </div>
        </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
