function Login() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white">
      <h2 className="text-xl font-semibold mb-4">Sign In</h2>
      <input
        type="email"
        placeholder="Email"
        className="border px-4 py-2 rounded mb-2 w-64"
      />
      <input
        type="password"
        placeholder="Password"
        className="border px-4 py-2 rounded mb-4 w-64"
      />
      <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        Login
      </button>
    </div>
  );
}

export default Login;
