const NAV = {
  admin: [
    ["overview", "Overview"],
    ["users", "Manage Users"],
    ["add-user", "Add User"],
    ["courses", "Manage Courses"]
  ],
  advisor: [
    ["overview", "Overview"],
    ["offerings", "Course Offerings"],
    ["students", "Students"],
    ["registration", "Student Registration"]
  ],
  student: [
    ["overview", "Overview"],
    ["courses", "My Courses"],
    ["history", "Academic History"],
    ["add-drop", "Add/Drop Request"]
  ]
};

// Show the navigation and page content
export default function Layout({
  user,
  page,
  onLogout,
  children
}) {
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href={`#/${user.role}/overview`}>
        <img className="brand-icon" src="/wu-logo.png" alt="WU" />
        <span>Wakanda University<span className="brand-sub">Course Registration Portal</span></span>
      </a>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Main navigation" className="side-nav">
          {NAV[user.role].map(
          ([key, label]) => <a
            key={key}
            href={`#/${user.role}/${key}`}
            className={page === key || page === "student-details" && key === "students" ? "active" : ""}
            aria-current={page === key ? "page" : undefined}
          >{label}</a>
        )}
        </nav>
      <div className="sidebar-footer">
        <span className="role-chip">{user.role}</span>
        <div className="small-text">Academic management</div>
      </div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <span className="topbar-title">Wakanda University 
            <span className="small-text">/ {page === "student-details"
              ? "Student Details"
              : NAV[user.role].find(([key]) => key === page)?.[1] || "Overview"}</span>
          </span>
        <div className="account-area">
          <span className="avatar">{user.name?.slice(0, 1)}</span>
          <div className="account-name">{user.name}<span className="small-text">{user.email}</span></div>
          <button type="button" className="secondary" onClick={onLogout}>Sign out</button>
        </div>
      </header>
      <main className="container">{children}</main>
    </div>
  </div>;
}