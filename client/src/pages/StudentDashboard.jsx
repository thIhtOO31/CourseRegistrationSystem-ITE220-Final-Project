import { useCallback, useEffect, useMemo, useState } from "react";
import StatusMessage from "../components/StatusMessage";
import PageIntro from "../components/PageIntro";
import StatCards from "../components/StatCards";

const CURRENT_TERM = "2026-1";

function formatBangkok(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(
    new Date(value)
  );
}

export default function StudentDashboard({
  request,
  currentUser,
  page,
  navigate
}) {
  const [termFilter, setTermFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [registrations, setRegistrations] = useState(null);
  const [history, setHistory] = useState(null);
  const [requestCourse, setRequestCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load the student's courses and records
  const load = useCallback(
    async () => {
      setLoading(true);
      setError("");
      try {
        const [registrationData, historyData] = await Promise.all([request(`/me/registrations?term=${CURRENT_TERM}`), request("/me/record")]);
        setRegistrations(registrationData);
        setHistory(historyData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [request]
  );
  
  useEffect(() => {
    setRequestCourse(null);
    load();
  }, [load, currentUser._id]);
  const groupedRecords = useMemo(
    () => {
      const groups = {};
      for (const record of history?.records || []) {
        if (termFilter !== "all" && record.term !== termFilter) continue;
        if (gradeFilter !== "all" && record.grade !== gradeFilter) continue;
        if (!groups[record.term]) groups[record.term] = [];
        groups[record.term].push(record);
      }
      return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
    },
    [history, termFilter, gradeFilter]
  );

  // Submit an add/drop request
  async function requestAddDrop(registrationId) {
    setError("");
    try {
      const fresh = await request(`/me/registrations?term=${CURRENT_TERM}`);
      setRegistrations(fresh);
      const registration = fresh.registrations.find(item => item._id === registrationId);
      if (!registration || !registration.offering.addDropIsOpen) {
        setRequestCourse(null);
        setError("The add/drop window is closed for this course.");
        return;
      }
      if (!history?.advisor?.email) {
        setRequestCourse(null);
        setError("Your assigned advisor email is not configured. Please contact an administrator.");
        return;
      }
      setRequestCourse(registration);
    } catch (err) {
      setError(err.message);
    }
  }

  const subject = requestCourse && history
    ? `Add/Drop Request - ${history.student.studentId} - ${requestCourse.offering.courseCode}`
    : "";

  const mailto = requestCourse && history?.advisor
    ? `mailto:${encodeURIComponent(history.advisor.email)}?subject=${encodeURIComponent(subject)}`
    : "#";

  return <>
    {page === "overview" &&
      <PageIntro
        title="Student overview"
        description="Your courses, academic progress, and registration information in one place."
      />}
    {page === "courses" &&
      <PageIntro
        title="My courses & timetable"
        description={`Your registered courses for ${CURRENT_TERM}.`}
      />}
    {page === "history" &&
      <PageIntro
        title="Academic history"
        description="Review completed courses, grades, and retake information."
      />}
    {page === "add-drop" &&
      <PageIntro
        title="Add/Drop request"
        description="Submit a manual request to your advisor. This does not register or drop courses automatically."
      />}
    <StatusMessage type="error">{error}</StatusMessage>
    {loading && <p>Loading your academic information...</p>}
    {page === "overview" && history &&
      <StatCards items={[
        {
          label: "Earned credits",
          value: history.totalCreditsEarned
        },
        {
          label: "Current term",
          value: CURRENT_TERM
        },
        {
          label: "Current courses",
          value: registrations?.registrations.length ?? "—"
        },
        {
          label: "Completed records",
          value: history.records.filter(r => !["F", "W"].includes(r.grade)).length
        }
      ]} />}

    {page === "overview" &&
      <section className="card">
        <h2>Quick links</h2>
        <div className="quick-links">
          <button onClick={() => navigate("courses")}>My courses</button>
          <button className="secondary" onClick={() => navigate("history")}>Academic history</button>
          <button className="secondary" onClick={() => navigate("add-drop")}>Add/Drop request</button>
        </div>
      </section>}
    {page === "overview" && history &&
      <section className="card">
        <h2>Academic summary</h2>
        <div className="summary-grid">
          <div><strong>Name:</strong> {history.student.name}</div>
          <div><strong>Student ID:</strong> {history.student.studentId}</div>
          <div><strong>Total earned credits:</strong> {history.totalCreditsEarned}</div>
          <div><strong>Advisor:</strong> {history.advisor ? `${history.advisor.name} (${history.advisor.email})` : "Not configured"}</div>
        </div>
      </section>}
    {(page === "courses" || page === "add-drop") && registrations &&
      <section className="card">
        <div className="section-heading">
          <h2>{page === "add-drop" ? "Choose a registered course" : "Current registration"} - {registrations.term}</h2>
          {registrations.termFinalised && <span className="badge">Term finalised</span>}
        </div>
        {registrations.registrations.length === 0
          ? <p>No courses registered for this term.</p>
          : <div className="table-wrap">
              <table>
              <thead><tr>
                  <th>Course</th>
                  <th>Section</th>
                  <th>Day / Time</th>
                  <th>Room</th>
                  <th>Instructor</th>
                  <th>Registration</th>
                  <th>Add/Drop</th>
                  <th>Request</th>
                </tr></thead>
              <tbody>
                  {registrations.registrations.map(
                  registration => {
                    const offering = registration.offering;
                    return <tr key={registration._id}>
                      <td>{offering.courseCode} - {offering.title}</td>
                      <td>{offering.section}</td>
                      <td>{offering.day} {offering.startTime}-{offering.endTime}</td>
                      <td>{offering.room}</td>
                      <td>
                        {offering.instructor}
                        {offering.instructorEmail && <div className="small-text">{offering.instructorEmail}</div>}
                      </td>
                      <td><span className="badge">{registration.status}</span></td>
                      <td>
                        <strong>{offering.addDropIsOpen ? "Open" : "Closed"}</strong>
                        {offering.addDropClosesAt &&
                          <div className="small-text">Closes {formatBangkok(offering.addDropClosesAt)} Bangkok</div>}
                      </td>
                      <td><button
                          type="button"
                          disabled={!offering.addDropIsOpen || registrations.termFinalised}
                          onClick={() => {
                            navigate("add-drop");
                            requestAddDrop(registration._id);
                          }}
                        >{page === "add-drop" ? "Select request" : "Request add/drop"}</button></td>
                    </tr>;
                  }
                )}
                </tbody>
            </table>
            </div>}
      </section>}
    {page === "add-drop" &&
      <section className="card">
        <h2>Manual request procedure</h2>
        <p>Download the form, fill in your details, and email it to your assigned advisor. Requests can only be initiated during a valid add/drop window. Your advisor makes the final registration changes.</p>
        <div className="button-row"><a className="button-link" href="/add-drop-form.docx" download>Download request form</a></div>
        <p className="small-text">Assigned advisor: {history?.advisor
            ? `${history.advisor.name} (${history.advisor.email})`
            : "Contact administration for advisor details"}</p>
      </section>}
    {page === "add-drop" && requestCourse && history?.advisor &&
      <section className="card highlight-card">
        <h2>Add/Drop Request - {requestCourse.offering.courseCode}</h2>
        <p>This request does not change your registration automatically. Complete the form and email it to your advisor.</p>
        <div className="button-row">
          <a className="button-link" href="/add-drop-form.docx" download>Download Add/Drop Request form</a>
          <a className="button-link secondary-link" href={mailto}>Open email to advisor</a>
        </div>
        <p><strong>Advisor email:</strong> {history.advisor.email}</p>
        <p><strong>Subject:</strong> {subject}</p>
        <p><strong>Details to use:</strong> {history.student.studentId}, {history.student.name}, {CURRENT_TERM}, {requestCourse.offering.courseCode}, Section {requestCourse.offering.section}.</p>
        <ol className="instructions">
          <li>Download and open the Add/Drop Request form.</li>
          <li>Fill in your student ID, name, term, and the course code and section you wish to add or drop.</li>
          <li>State the reason for the request and sign the form.</li>
          <li>Email the completed form as an attachment to your advisor at {history.advisor.email}, using the subject line: {subject}</li>
          <li>Your advisor will confirm by email once the change is made.</li>
        </ol>
      </section>}
    {page === "history" && history &&
      <section className="card">
        <h2>Completed course history</h2>
        <div className="filters">
          <label>Academic term<select value={termFilter} onChange={e => setTermFilter(e.target.value)}>
              <option value="all">All terms</option>
              {[...new Set(history.records.map(r => r.term))].sort().reverse().map(term => <option key={term}>{term}</option>)}
            </select></label>
          <label>Grade<select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}>
              <option value="all">All grades</option>
              {[...new Set(history.records.map(r => r.grade))].sort().map(grade => <option key={grade}>{grade}</option>)}
            </select></label>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setTermFilter("all");
              setGradeFilter("all");
            }}
          >Clear filters</button>
        </div>
        {groupedRecords.length === 0
          ? <p className="empty-state">No academic records match your filters.</p>
          : groupedRecords.map(
            ([term, rows]) => <div key={term} className="history-group">
              <h3>{term}</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Course</th><th>Title</th><th>Credits</th><th>Grade</th><th>Status</th></tr></thead>
                  <tbody>{rows.map(
                      record => <tr key={record._id}>
                        <td>{record.courseCode}</td>
                        <td>{record.title}</td>
                        <td>{record.credits}</td>
                        <td>{record.grade}</td>
                        <td>{record.retakeRequired ? "Retake required" : record.grade === "F" ? "Retake completed" : "-"}</td>
                      </tr>
                    )}</tbody>
                </table>
              </div>
            </div>
          )}
      </section>}
  </>;
}