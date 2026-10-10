import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "./api";

import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import AdvisorDashboard from "./pages/AdvisorDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import Layout from "./components/Layout";

const TOKEN_KEY = "courseRegistrationToken";
const USER_KEY = "courseRegistrationUser";

const PAGES = {
  admin: ["overview", "users", "add-user", "courses"],
  advisor: ["overview", "offerings", "students", "student-details", "registration"],
  student: ["overview", "courses", "history", "add-drop"]
};

// Restore the logged-in user after a page refresh
function readStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(readStoredUser);
  const [loginMessage, setLoginMessage] = useState("");
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(
    () => {
      const onHash = () => setHash(window.location.hash);
      window.addEventListener("hashchange", onHash);
      return () => window.removeEventListener("hashchange", onHash);
    },
    []
  );

  const logout = useCallback(
    (expired = false) => {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      setToken("");
      setUser(null);
      setLoginMessage(expired ? "Please log in again." : "");
    },
    []
  );

  // Save the signed-in account
  function handleLogin(data) {
    sessionStorage.setItem(TOKEN_KEY, data.token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    setLoginMessage("");
  }

  // Send API requests using the current login token
  const request = useMemo(
    () => async (path, options = {}) => {
      try {
        return await apiRequest(path, {
          ...options,
          token
        });
      } catch (error) {
        if (error.status === 401) logout(true);
        throw error;
      }
    },
    [token, logout]
  );

  const role = user?.role;
  const [route, search = ""] = hash.replace(/^#\/?/, "").split("?");
  const [routeRole, routePage] = route.split("/");
  const valid = PAGES[role]?.includes(routePage) && routeRole === role;
  const page = valid ? routePage : "overview";

  useEffect(
    () => {
      if (token && role && PAGES[role] && !valid) {
        window.location.replace(`#/${role}/overview`);
      }
    },
    [token, role, valid]
  );

  // Switch between dashboard pages
  function navigate(nextPage, params = "") {
    const destination = `#/${role}/${nextPage}${params ? `?${params}` : ""}`;
    if (window.location.hash === destination) setHash(destination);else window.location.hash = destination;
  }

  if (!token || !user) 
    return <Login onLogin={handleLogin} message={loginMessage} />;

  if (!PAGES[role]) 
    return <Login onLogin={handleLogin} message="Unknown account role." />;

  const props = {
    request,
    page,
    navigate,
    search: valid ? search : ""
  };
  
  const screen = role === "admin"
    ? <AdminDashboard {...props} currentUser={user} />
    : role === "advisor"
      ? <AdvisorDashboard {...props} currentUser={user} />
      : <StudentDashboard {...props} currentUser={user} />;
  return <Layout user={user} page={page} onLogout={() => logout()}>{screen}</Layout>;
}