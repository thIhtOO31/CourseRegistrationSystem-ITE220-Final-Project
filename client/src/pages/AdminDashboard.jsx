import { useCallback, useEffect, useMemo, useState } from "react";
import PageIntro from "../components/PageIntro";
import StatCards from "../components/StatCards";
import StatusMessage from "../components/StatusMessage";
import { accountEmail } from "../accountEmail";

const blankForm = {
  name: "",
  email: "",
  role: "student",
  password: "",
  studentId: "",
  advisorId: "",
  active: true
};

const blankCourse = {
  code: "",
  title: "",
  credits: 3,
  description: ""
};

export default function AdminDashboard({
  request,
  currentUser,
  page,
  navigate
}) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [courses, setCourses] = useState([]);
  const [courseForm, setCourseForm] = useState(blankCourse);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [advisorFilter, setAdvisorFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load accounts for the admin pages
  const loadUsers = useCallback(
    async () => {
      setLoading(true);
      try {
        setUsers(await request("/users"));
        setError("");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [request]
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);
  const loadCourses = useCallback(
    async () => {
      try {
        setCourses(await request("/courses"));
      } catch (err) {
        setError(err.message);
      }
    },
    [request]
  );

  useEffect(() => {
    if (page === "courses") loadCourses();
  }, [page, loadCourses]);
  useEffect(
    () => {
      if (page === "add-user") {
        setEditingId("");
        setForm(blankForm);
      }
    },
    [page]
  );

  const advisors = useMemo(() => users.filter(item => item.role === "advisor"), [users]);

  const filtered = users.filter(
    user => {
      const term = `${user.name} ${user.email} ${user.studentId || ""}`.toLowerCase();
      return term.includes(search.toLowerCase().trim()) &&
        (statusFilter === "all" || statusFilter === "active" === user.active) &&
        (advisorFilter === "all" || user.role === "student" && user.advisorId === advisorFilter);
    }
  );

  function resetForm() {
    setEditingId("");
    setForm(blankForm);
  }

  // Fill the form with an existing account
  function beginEdit(user) {
    setEditingId(user._id);
    setForm(
      {
        name: user.name,
        email: user.email,
        role: user.role,
        password: "",
        studentId: user.studentId || "",
        advisorId: user.advisorId || "",
        active: user.active
      }
    );
    setError("");
    setSuccess("");
    navigate("users");
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  // Update account form fields
  function change(event) {
    const {
      name,
      value,
      type,
      checked
    } = event.target;
    setForm(
      old => {
        const next = {
          ...old,
          [name]: type === "checkbox" ? checked : value
        };
        if (name === "role" && value === "admin") next.name = "Admin";
        next.email = accountEmail(next);
        return next;
      }
    );
  }

  // Save a new course to the catalog
  async function submitCourse(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await request(
        "/courses",
        {
          method: "POST",
          body: {
            ...courseForm,
            code: courseForm.code.trim().toUpperCase(),
            credits: Number(courseForm.credits)
          }
        }
      );

      setSuccess("Course created.");
      setCourseForm(blankCourse);
      setShowCourseForm(false);

      await loadCourses();
    } catch (err) {
      setError([err.message, ...(err.errors || [])].join(" "));
    } finally {
      setSaving(false);
    }
  }

  // Create an account or update an existing one
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const body = {
        name: form.name,
        email: form.email,
        role: form.role,
        ...(form.role === "student"
          ? {
            studentId: form.studentId,
            advisorId: form.advisorId
          }
          : {})
      };

      if (editingId && page === "users") {
        body.active = form.active;
        await request(`/users/${editingId}`, {
          method: "PATCH",
          body
        });
        setSuccess("Account updated.");
      } else {
        body.password = form.password;
        await request("/users", {
          method: "POST",
          body
        });
        setSuccess("Account created. Share the initial password securely with the user.");
      }

      resetForm();

      await loadUsers();
    } catch (err) {
      setError([err.message, ...(err.errors || [])].join(" "));
    } finally {
      setSaving(false);
    }
  }

  // Remove an account when allowed
  async function remove(user) {
    if (!window.confirm(`Delete or deactivate ${user.name}?`)) 
      return;

    setError("");
    setSuccess("");

    try {
      const result = await request(`/users/${user._id}`, {
        method: "DELETE"
      });

      setSuccess(result.message);
      
      if (editingId === user._id) resetForm();
      await loadUsers();
    } catch (err) {
      setError([err.message, ...(err.errors || [])].join(" "));
    }
  }

  // Disable an active account
  async function deactivate(user) {
    if (!window.confirm(`Deactivate ${user.name}?`)) 
      return;

    setError("");
    setSuccess("");

    try {
      await request(`/users/${user._id}`, {
        method: "PATCH",
        body: {
          active: false
        }
      });

      setSuccess("Account deactivated.");
      
      await loadUsers();
    } catch (err) {
      setError([err.message, ...(err.errors || [])].join(" "));
    }
  }

  const userForm = isEdit => <section className="card" key={isEdit ? editingId : "new"}>
    <h2>{isEdit ? "Edit account" : "Create account"}</h2>
    <form className="form-grid" onSubmit={submit}>
      <label>Full name<input
          name="name"
          value={form.name}
          onChange={change}
          readOnly={form.role === "admin"}
          required
        /></label>
      <label>Academic email<input
          name="email"
          type="email"
          value={form.email}
          readOnly
          placeholder="Generated from name or student ID"
          required
        /></label>
      <label>Account type<select name="role" value={form.role} onChange={change}>
          <option value="student">Student</option>
          <option value="advisor">Advisor</option>
          <option value="admin">Administrator</option>
        </select></label>
      {!isEdit &&
        <label>Initial password<input
            name="password"
            type="password"
            value={form.password}
            onChange={change}
            minLength="8"
            required
            autoComplete="new-password"
          /></label>}
      {form.role === "student" &&
        <>
          <label>Student ID<input name="studentId" value={form.studentId} onChange={change} required /></label>
          <label>Assigned advisor<select name="advisorId" value={form.advisorId} onChange={change} required>
              <option value="">Select advisor</option>
              {advisors.filter(a => a.active || a._id === form.advisorId).map(
                a => <option key={a._id} value={a._id}>{a.name}</option>
              )}
            </select></label>
        </>}
      {isEdit &&
        <label className="checkbox-label"><input name="active" type="checkbox" checked={form.active} onChange={change} /> Active</label>}
      <div className="button-row">
        <button type="submit" disabled={saving}>{saving ? "Saving..." : isEdit ? "Save changes" : "Create account"}</button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            resetForm();
            if (page === "add-user") navigate("users");
          }}
        >{isEdit ? "Cancel" : "Back to users"}</button>
      </div>
    </form>
  </section>;
  return <>
    {page === "overview" &&
      <>
        <PageIntro
          title="Admin overview"
          description="Manage academic accounts and keep user information up to date."
        ><button onClick={() => {
            resetForm();
            navigate("add-user");
          }}>+ Add user</button></PageIntro>
        <StatCards items={[
          {
            label: "Total accounts",
            value: users.length
          },
          {
            label: "Active accounts",
            value: users.filter(u => u.active).length
          },
          {
            label: "Advisors",
            value: advisors.length
          },
          {
            label: "Students",
            value: users.filter(u => u.role === "student").length
          }
        ]} />
        <section className="card">
          <h2>Quick actions</h2>
          <div className="quick-links">
            <button onClick={() => navigate("users")}>Manage users</button>
            <button
              className="secondary"
              onClick={() => {
                resetForm();
                navigate("add-user");
              }}
            >Create new account</button>
            <button className="secondary" onClick={() => navigate("courses")}>Manage courses</button>
          </div>
        </section>
        <section className="card">
          <h2>Account status</h2>
          <p>{users.filter(u => !u.active).length} inactive account(s). Review accounts from the Manage Users page.</p>
        </section>
      </>}
    {page === "users" &&
      <>
      <PageIntro
          title="Manage users"
          description="Find, update, deactivate, or remove accounts with existing safeguards."
        ><button onClick={() => {
            resetForm();
            navigate("add-user");
          }}>+ Add user</button></PageIntro>
    </>}
    {page === "add-user" &&
      <PageIntro
        title="Add user"
        description="Create an administrator, advisor, or student account."
      />}
    {page === "courses" &&
      <PageIntro
        title="Manage Courses"
        description="Create courses in the catalog before advisors open sections."
      ><button onClick={() => setShowCourseForm(true)}>+ Create Course</button></PageIntro>}
    <StatusMessage type="error">{error}</StatusMessage>
    <StatusMessage type="success">{success}</StatusMessage>
    {page === "users" && editingId && userForm(true)}
    {page === "add-user" && userForm(false)}
    {page === "courses" &&
      <>
        {showCourseForm &&
          <section className="card">
            <h2>Create Course</h2>
            <form className="form-grid" onSubmit={submitCourse}>
              <label>Course Code<input
                  required
                  maxLength="10"
                  placeholder="CSC350"
                  value={courseForm.code}
                  onChange={e => setCourseForm(old => ({
                    ...old,
                    code: e.target.value.toUpperCase()
                  }))}
                /></label>
              <label>Course Title<input
                  required
                  value={courseForm.title}
                  onChange={e => setCourseForm(old => ({
                    ...old,
                    title: e.target.value
                  }))}
                /></label>
              <label>Credits<input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={courseForm.credits}
                  onChange={e => setCourseForm(old => ({
                    ...old,
                    credits: e.target.value
                  }))}
                /></label>
              <label>Description (optional)<textarea
                  rows="2"
                  value={courseForm.description}
                  onChange={e => setCourseForm(old => ({
                    ...old,
                    description: e.target.value
                  }))}
                /></label>
              <div className="button-row">
                <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Course"}</button>
                <button type="button" className="secondary" onClick={() => setShowCourseForm(false)}>Cancel</button>
              </div>
            </form>
          </section>}
        <section className="card">
          <h2>Course catalog ({courses.length})</h2>
          {courses.length === 0
            ? <p className="empty-state">No courses found.</p>
            : <div className="table-wrap"><table>
                <thead><tr><th>Code</th><th>Course Title</th><th>Credits</th><th>Description</th></tr></thead>
                <tbody>
        {courses.map(
                    course => <tr key={course._id}>
                      <td>{course.code}</td>
                      <td>{course.title}</td>
                      <td>{course.credits}</td>
                      <td>{course.description || "—"}</td>
                    </tr>
                  )}
      </tbody>
              </table></div>}
        </section>
      </>}
    {page === "users" &&
      <section className="card">
        <div className="section-heading"><h2>Accounts ({filtered.length})</h2></div>
        <div className="filters">
          <label className="search-field">Search accounts<input
              placeholder="Name, email or student ID"
              value={search}
              onChange={e => setSearch(e.target.value)}
            /></label>
          <label>Account status<select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select></label>
          <label>Assigned advisor<select value={advisorFilter} onChange={e => setAdvisorFilter(e.target.value)}>
              <option value="all">All advisors / accounts</option>
              {advisors.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select></label>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setAdvisorFilter("all");
            }}
          >Clear filters</button>
        </div>
        {loading
          ? <p>Loading accounts...</p>
          : filtered.length === 0
            ? <p className="empty-state">No accounts match your filters.</p>
            : <div className="table-wrap"><table>
                <thead><tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Account</th>
                    <th>Student ID</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr></thead>
                <tbody>
        {filtered.map(
                    user => <tr key={user._id}>
                      <td><strong>{user.name}</strong></td>
                      <td>{user.email}</td>
                      <td style={{
                        textTransform: "capitalize"
                      }}>{user.role}</td>
                      <td>{user.studentId || "—"}</td>
                      <td><span className="badge">{user.active ? "Active" : "Inactive"}</span></td>
                      <td><div className="actions">
                          <button className="secondary" onClick={() => beginEdit(user)}>Edit</button>
                          <button
                            className="secondary"
                            disabled={!user.active || user._id === currentUser._id}
                            onClick={() => deactivate(user)}
                          >Deactivate</button>
                          <button
                            className="danger"
                            disabled={user._id === currentUser._id}
                            onClick={() => remove(user)}
                          >Delete</button>
                        </div></td>
                    </tr>
                  )}
      </tbody>
              </table></div>}
      </section>}
  </>;
}