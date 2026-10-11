import { useCallback, useEffect, useRef, useState } from "react";
import StatusMessage from "../components/StatusMessage";
import PageIntro from "../components/PageIntro";
import StatCards from "../components/StatCards";

const CURRENT_TERM = "2026-1";

const blankOffering = {
  courseId: "",
  term: CURRENT_TERM,
  section: 1,
  day: "Mon",
  startTime: "09:00",
  endTime: "11:00",
  room: "",
  instructor: "",
  instructorEmail: "",
  seats: 20
};

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

function bangkokInputToIso(value) {
  if (!value) return null;
  const normalized = value.length === 16 ? `${value}:00` : value;
  const date = new Date(`${normalized}+07:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function AdvisorDashboard({
  request,
  page,
  navigate,
  search,
  currentUser
}) {
  const [courseSearch, setCourseSearch] = useState("");
  const [courseDay, setCourseDay] = useState("all");
  const [seatFilter, setSeatFilter] = useState("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [registrationStudentSearch, setRegistrationStudentSearch] = useState("");
  const [advisorFilter, setAdvisorFilter] = useState("all");
  const [courses, setCourses] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [students, setStudents] = useState([]);
  const [offeringForm, setOfferingForm] = useState(blankOffering);
  const [editingOfferingId, setEditingOfferingId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [record, setRecord] = useState(null);
  const [registrations, setRegistrations] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [selectedOfferingIds, setSelectedOfferingIds] = useState([]);
  const [windowInputs, setWindowInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const requestSequence = useRef(0);

  // Load the advisor's courses and students
  const loadBase = useCallback(
    async () => {
      setLoading(true);
      setError("");
      try {
        const [courseList, offeringList, studentList] = await Promise.all([
          request("/courses"),
          request(`/offerings?term=${CURRENT_TERM}`),
          request("/students")
        ]);

        setCourses(courseList);
        setOfferings(offeringList);
        setStudents(studentList);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [request]
  );

  useEffect(() => {
    loadBase();
  }, [loadBase]);
  useEffect(
    () => {
      const studentId = new URLSearchParams(search).get("student");
      if (studentId && students.some(item => item._id === studentId)) {
        setSelectedStudentId(studentId);
        setSelectedOfferingIds([]);
        setRecord(null);
        setRegistrations(null);
        setEligibility(null);
      }
    },
    [search, students]
  );

  const refreshStudentData = useCallback(
    async () => {
      if (!selectedStudentId) {
        setRecord(null);
        setRegistrations(null);
        setEligibility(null);
        return;
      }

      const sequence = ++requestSequence.current;

      setLoadingStudent(true);

      setError("");

      try {
        const selectedQuery = selectedOfferingIds.length ? `&selectedOfferingIds=${encodeURIComponent(selectedOfferingIds.join(","))}` : "";
        const [history, registrationData, eligibleData] = await Promise.all(
          [
            request(`/students/${selectedStudentId}/record`),
            request(`/students/${selectedStudentId}/registrations?term=${CURRENT_TERM}`),
            request(`/students/${selectedStudentId}/eligible?term=${CURRENT_TERM}${selectedQuery}`)
          ]
        );

        if (sequence !== requestSequence.current) return;

        setRecord(history);
        setRegistrations(registrationData);
        setEligibility(eligibleData);
      } catch (err) {
        if (sequence !== requestSequence.current) return;
        setError([err.message, ...(err.errors || [])].join(" "));
      } finally {
        if (sequence === requestSequence.current) setLoadingStudent(false);
      }
    },
    [request, selectedStudentId, selectedOfferingIds]
  );

  useEffect(() => {
    refreshStudentData();
  }, [refreshStudentData]);

  // Choose a student and reset the current details.
  function selectStudent(studentId) {
    setSelectedStudentId(studentId);
    setSelectedOfferingIds([]);
    setRecord(null);
    setRegistrations(null);
    setEligibility(null);
    setSuccess("");
  }

  function pickStudent(event) {
    selectStudent(event.target.value);
  }

  function offeringChange(event) {
    const {
      name,
      value
    } = event.target;
    setOfferingForm(old => ({
      ...old,
      [name]: value
    }));
  }

  // Load a course section into the edit form
  function beginOfferingEdit(offering) {
    setEditingOfferingId(offering._id);
    setOfferingForm(
      {
        courseId: offering.courseId,
        term: offering.term,
        section: offering.section,
        day: offering.day,
        startTime: offering.startTime,
        endTime: offering.endTime,
        room: offering.room,
        instructor: offering.instructor,
        instructorEmail: offering.instructorEmail || "",
        seats: offering.seats
      }
    );
    setError("");
    setSuccess("");
  }

  function resetOfferingForm() {
    setEditingOfferingId("");
    setOfferingForm(blankOffering);
  }

  // Save a new or edited course offering
  async function saveOffering(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const body = {
        ...offeringForm,
        section: Number(offeringForm.section),
        seats: Number(offeringForm.seats)
      };

      if (editingOfferingId) {
        await request(`/offerings/${editingOfferingId}`, {
          method: "PATCH",
          body
        });
        setSuccess("Offering updated.");
      } else {
        await request("/offerings", {
          method: "POST",
          body
        });
        setSuccess("Offering created.");
      }

      resetOfferingForm();

      await loadBase();
      if (selectedStudentId) await refreshStudentData();
    } catch (err) {
      setError([err.message, ...(err.errors || [])].join(" "));
    } finally {
      setSaving(false);
    }
  }

  // Remove a course section
  async function deleteOffering(offering) {
    if (!window.confirm(`Remove ${offering.courseCode} Section ${offering.section}?`)) return;
    setError("");
    setSuccess("");
    try {
      await request(`/offerings/${offering._id}`, {
        method: "DELETE"
      });

      setSuccess("Offering removed.");

      if (editingOfferingId === offering._id) resetOfferingForm();
      await loadBase();
      if (selectedStudentId) await refreshStudentData();
    } catch (err) {
      setError([err.message, ...(err.errors || [])].join(" "));
    }
  }

  // Select or unselect a course section
  function toggleSelection(offeringId) {
    setSelectedOfferingIds(
      old => old.includes(offeringId) ? old.filter(id => id !== offeringId) : [...old, offeringId]
    );
    setSuccess("");
  }

  // Register the selected student for courses
  async function saveRegistrations() {
    if (!selectedStudentId || selectedOfferingIds.length === 0) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await request(
        "/registrations",
        {
          method: "POST",
          body: {
            studentId: selectedStudentId,
            term: CURRENT_TERM,
            offeringIds: selectedOfferingIds
          }
        }
      );

      setSelectedOfferingIds([]);

      setSuccess("Registration saved.");
      await loadBase();
    } catch (err) {
      setError([err.message, ...(err.errors || [])].join(" "));
      await loadBase();
    } finally {
      setSaving(false);
    }
  }

  // Drop one student registration
  async function removeRegistration(registration) {
    const name = registration.offering?.courseCode || "this course";
    if (!window.confirm(`Remove ${name} from this student's registration?`)) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await request(`/registrations/${registration._id}`, {
        method: "DELETE"
      });
      setSuccess("Registration removed.");
      setSelectedOfferingIds([]);
      await loadBase();
    } catch (err) {
      setError([err.message, ...(err.errors || [])].join(" "));
    } finally {
      setSaving(false);
    }
  }

  // Open the add/drop period for a section
  async function openAddDrop(offering) {
    const iso = bangkokInputToIso(windowInputs[offering._id]);
    if (!iso) {
      setError("Choose a valid Bangkok closing date and time.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await request(
        `/offerings/${offering._id}`,
        {
          method: "PATCH",
          body: {
            addDropOpen: true,
            addDropClosesAt: iso
          }
        }
      );

      setSuccess(`Add/drop opened for ${offering.courseCode} Section ${offering.section}.`);
      await loadBase();
      if (selectedStudentId) await refreshStudentData();
    } catch (err) {
      setError([err.message, ...(err.errors || [])].join(" "));
    } finally {
      setSaving(false);
    }
  }

  // Close the add/drop period for a section
  async function closeAddDrop(offering) {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await request(
        `/offerings/${offering._id}`,
        {
          method: "PATCH",
          body: {
            addDropOpen: false
          }
        }
      );
      
      setSuccess(`Add/drop closed for ${offering.courseCode} Section ${offering.section}.`);
      await loadBase();
      if (selectedStudentId) await refreshStudentData();
    } catch (err) {
      setError([err.message, ...(err.errors || [])].join(" "));
    } finally {
      setSaving(false);
    }
  }

  // Filtering
  const filteredOfferings = offerings.filter(
    offering => {
      const haystack = `${offering.courseCode} ${offering.title} ${offering.instructor}`.toLowerCase();
      return haystack.includes(courseSearch.toLowerCase().trim()) &&
        (courseDay === "all" || offering.day === courseDay) &&
        (seatFilter === "all" ||
          (seatFilter === "available" ? offering.seatsRemaining > 0 : offering.seatsRemaining === 0));
    }
  );

  const filteredStudents = students.filter(
    student => `${student.name} ${student.studentId}`.toLowerCase().includes(studentSearch.toLowerCase().trim()) &&
      (advisorFilter === "all" || student.advisorId === currentUser._id)
  );

  const matchingRegistrationStudents = students.filter(
    student => `${student.name} ${student.studentId}`.toLowerCase().includes(registrationStudentSearch.toLowerCase().trim())
  );

  const detailsId = new URLSearchParams(search).get("student");
  const detailStudent = students.find(student => student._id === detailsId);
  const selectedRows = (eligibility?.sections || []).filter(section => selectedOfferingIds.includes(section._id));
  const selectionValid = selectedRows.length === selectedOfferingIds.length && selectedRows.every(section => section.selectable);
  const termFinalised = Boolean(eligibility?.termFinalised || registrations?.termFinalised);
  return <>
    {page === "overview" &&
      <>
        <PageIntro
          title="Advisor overview"
          description={`Course registration and academic advising for term ${CURRENT_TERM}.`}
        />
        <StatCards items={[
          {
            label: "Course sections",
            value: offerings.length
          },
          {
            label: "Available sections",
            value: offerings.filter(o => o.seatsRemaining > 0).length
          },
          {
            label: "Active students",
            value: students.length
          },
          {
            label: "Open add/drop windows",
            value: offerings.filter(o => o.addDropIsOpen).length
          }
        ]} />
        <section className="card">
          <h2>Quick actions</h2>
          <div className="quick-links">
            <button onClick={() => navigate("offerings")}>Manage course offerings</button>
            <button className="secondary" onClick={() => navigate("students")}>View students</button>
            <button className="secondary" onClick={() => navigate("registration")}>Register student</button>
          </div>
        </section>
        <section className="card">
          <h2>Current term summary</h2>
          <p>{offerings.reduce((sum, o) => sum + o.seatsTaken, 0)} occupied seats across {offerings.length} sections. Course and student details are available in their own pages.</p>
        </section>
      </>}
    {page === "offerings" &&
      <PageIntro
        title="Course offerings"
        description="Create sections, edit schedules, and manage add/drop windows."
      />}
    {page === "students" &&
      <PageIntro
        title="Students"
        description="Search students and review their academic records and current courses."
      />}
    {page === "student-details" &&
      <PageIntro
        title="Student details"
        description="Academic profile, grades, and current registrations."
      />}
    {page === "registration" &&
      <PageIntro
        title="Student registration"
        description="Check course eligibility and register students into eligible sections."
      />}
    <StatusMessage type="error">{error}</StatusMessage>
    <StatusMessage type="success">{success}</StatusMessage>
    {page === "offerings" &&
      <section className="card">
        <h2>{editingOfferingId ? "Edit offering" : "Open a course offering"}</h2>
        <form className="form-grid" onSubmit={saveOffering}>
          <label>Course
            <select name="courseId" value={offeringForm.courseId} onChange={offeringChange} required>
              <option value="">Select course</option>
              {courses.map(course => <option key={course._id} value={course._id}>{course.code} - {course.title}</option>)}
            </select>
          </label>
          <label>Term<input name="term" value={offeringForm.term} onChange={offeringChange} required /></label>
          <label>Section<input
              name="section"
              type="number"
              min="1"
              step="1"
              value={offeringForm.section}
              onChange={offeringChange}
              required
            /></label>
          <label>Day
            <select name="day" value={offeringForm.day} onChange={offeringChange}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <option key={day}>{day}</option>)}
            </select>
          </label>
          <label>Start time<input
              name="startTime"
              type="time"
              value={offeringForm.startTime}
              onChange={offeringChange}
              required
            /></label>
          <label>End time<input
              name="endTime"
              type="time"
              value={offeringForm.endTime}
              onChange={offeringChange}
              required
            /></label>
          <label>Room<input name="room" value={offeringForm.room} onChange={offeringChange} required /></label>
          <label>Instructor<input name="instructor" value={offeringForm.instructor} onChange={offeringChange} required /></label>
          <label>Instructor email<input
              name="instructorEmail"
              type="email"
              value={offeringForm.instructorEmail}
              onChange={offeringChange}
              placeholder="Optional"
            /></label>
          <label>Seats<input
              name="seats"
              type="number"
              min="0"
              step="1"
              value={offeringForm.seats}
              onChange={offeringChange}
              required
            /></label>
          <div className="button-row">
            <button type="submit" disabled={saving}>{saving ? "Saving..." : editingOfferingId ? "Save offering" : "Create offering"}</button>
            {editingOfferingId &&
              <button type="button" className="secondary" onClick={resetOfferingForm}>Cancel</button>}
          </div>
        </form>
      </section>}
    {page === "offerings" &&
      <section className="card">
        <h2>Offerings for {CURRENT_TERM}</h2>
        <div className="filters">
          <label className="search-field">Search offerings<input
              value={courseSearch}
              onChange={e => setCourseSearch(e.target.value)}
              placeholder="Course code, title or instructor"
            /></label>
          <label>Teaching day<select value={courseDay} onChange={e => setCourseDay(e.target.value)}>
              <option value="all">All days</option>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <option key={d} value={d}>{d}</option>)}
            </select></label>
          <label>Seat availability<select value={seatFilter} onChange={e => setSeatFilter(e.target.value)}>
              <option value="all">All sections</option>
              <option value="available">Available</option>
              <option value="full">Full</option>
            </select></label>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setCourseSearch("");
              setCourseDay("all");
              setSeatFilter("all");
            }}
          >Clear filters</button>
        </div>
        {loading
          ? <p>Loading offerings...</p>
          : filteredOfferings.length === 0
            ? <p className="empty-state">No offerings match your filters.</p>
            : <div className="table-wrap">
            <table>
                <thead><tr>
                    <th>Course</th>
                    <th>Section</th>
                    <th>Schedule</th>
                    <th>Room</th>
                    <th>Instructor</th>
                    <th>Seats</th>
                    <th>Add/Drop</th>
                    <th>Actions</th>
                  </tr></thead>
                <tbody>
                {filteredOfferings.map(
                    offering => <tr key={offering._id}>
                      <td>{offering.courseCode} - {offering.title}</td>
                      <td>{offering.section}</td>
                      <td>{offering.day} {offering.startTime}-{offering.endTime}</td>
                      <td>{offering.room}</td>
                      <td>
                        {offering.instructor}
                        {offering.instructorEmail && <div className="small-text">{offering.instructorEmail}</div>}
                      </td>
                      <td>{offering.seatsTaken}/{offering.seats} ({offering.seatsRemaining} left)</td>
                      <td>
                        <label>ADD/DROP status
                        <select
                            aria-label={`ADD/DROP status for ${offering.courseCode} section ${offering.section}`}
                            value={offering.addDropIsOpen ? "open" : "closed"}
                            disabled={saving}
                            onChange={e => e.target.value === "open" ? openAddDrop(offering) : closeAddDrop(offering)}
                          >
                            <option value="open">Open</option>
                            <option value="closed">Closed</option>
                          </select>
                      </label>
                        {offering.addDropClosesAt &&
                          <div className="small-text">Closes: {formatBangkok(offering.addDropClosesAt)} Bangkok</div>}
                        <input
                          aria-label={`Closing date for ${offering.courseCode} section ${offering.section}`}
                          type="datetime-local"
                          value={windowInputs[offering._id] || ""}
                          onChange={e => setWindowInputs(
                            old => ({
                              ...old,
                              [offering._id]: e.target.value
                            })
                          )}
                        />
                      </td>
                      <td className="actions">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => beginOfferingEdit(offering)}
                        >Edit</button>
                        <button type="button" className="danger" onClick={() => deleteOffering(offering)}>Remove</button>
                      </td>
                    </tr>
                  )}
              </tbody>
              </table>
          </div>}
      </section>}
    {page === "students" &&
      <section className="card">
        <h2>Student directory ({filteredStudents.length})</h2>
        <div className="filters">
          <label className="search-field">Search students<input
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              placeholder="Name or student ID"
            /></label>
          <label>Assigned advisor<select value={advisorFilter} onChange={e => setAdvisorFilter(e.target.value)}>
              <option value="all">All advisors</option>
              <option value="mine">My advisees</option>
            </select></label>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setStudentSearch("");
              setAdvisorFilter("all");
            }}
          >Clear filters</button>
        </div>
        {loading
          ? <p>Loading students...</p>
          : filteredStudents.length === 0
            ? <p className="empty-state">No students match your filters.</p>
            : <div className="table-wrap"><table>
                <thead><tr><th>Student ID</th><th>Full name</th><th>Email</th><th>Academic information</th></tr></thead>
                <tbody>
          {filteredStudents.map(
                    student => <tr key={student._id}>
                      <td>{student.studentId}</td>
                      <td>{student.name}</td>
                      <td>{student.email}</td>
                      <td><button
                          type="button"
                          className="secondary"
                          onClick={() => navigate("student-details", `student=${encodeURIComponent(student._id)}`)}
                        >View details</button></td>
                    </tr>
                  )}
        </tbody>
              </table></div>}
      </section>}
    {page === "student-details" &&
      <section className="card">
        <div className="button-row"><button type="button" className="secondary" onClick={() => navigate("students")}>← Back to Students</button></div>
        {!loading && !detailStudent
          ? <p className="empty-state">Student not found.</p>
          : <>
            {detailStudent &&
              <div className="section-heading">
                <h2>{detailStudent.name} · {detailStudent.studentId}</h2>
                <button
                  type="button"
                  onClick={() => navigate("registration", `student=${encodeURIComponent(detailStudent._id)}`)}
                >Register this Student →</button>
              </div>}
            {detailStudent && <p><strong>Email:</strong> {detailStudent.email}</p>}
            {loadingStudent && <p>Loading student information...</p>}
            {detailStudent && selectedStudentId === detailStudent._id && record &&
              <div className="summary-grid">
                <div><strong>Earned credits</strong><p>{record.totalCreditsEarned}</p></div>
                <div><strong>Assigned advisor</strong><p>{record.advisor?.name || "Not configured"}</p></div>
              </div>}
            {detailStudent && selectedStudentId === detailStudent._id && record &&
              <>
                <h3>Academic records</h3>
                {record.records.length === 0
                  ? <p>No academic records.</p>
                  : <div className="table-wrap"><table>
                      <thead><tr><th>Term</th><th>Course</th><th>Grade</th><th>Status</th></tr></thead>
                      <tbody>{record.records.map(
                          item => <tr key={item._id}>
                            <td>{item.term}</td>
                            <td>{item.courseCode} · {item.title}</td>
                            <td>{item.grade}</td>
                            <td>{item.retakeRequired
                                ? "Retake required"
                                : item.grade === "W"
                                  ? "Withdrawn"
                                  : item.grade === "F" ? "Retake completed" : "Completed"}</td>
                          </tr>
                        )}</tbody>
                    </table></div>}
              </>}
            {detailStudent && selectedStudentId === detailStudent._id && registrations &&
              <>
                <h3>Current registrations ({registrations.registrations.length})</h3>
                {registrations.registrations.length === 0
                  ? <p>No registered courses this term.</p>
                  : <div className="table-wrap"><table>
                      <thead><tr><th>Course</th><th>Schedule</th><th>Room</th><th>Status</th></tr></thead>
                      <tbody>{registrations.registrations.map(
                          item => <tr key={item._id}>
                            <td>{item.offering.courseCode} · Section {item.offering.section}</td>
                            <td>{item.offering.day} {item.offering.startTime}-{item.offering.endTime}</td>
                            <td>{item.offering.room}</td>
                            <td>{item.status}</td>
                          </tr>
                        )}</tbody>
                    </table></div>}
              </>}
          </>}
      </section>}
    {page === "registration" &&
      <section className="card">
        <h2>Register a student</h2>
        <div className="filters">
          <label className="search-field">Search students
          <input
              value={registrationStudentSearch}
              onChange={e => setRegistrationStudentSearch(e.target.value)}
              placeholder="Student name or ID"
            />
        </label>
          <button type="button" className="secondary" onClick={() => setRegistrationStudentSearch("")}>Clear search</button>
        </div>
        <label>Student
          <select value={selectedStudentId} onChange={pickStudent}>
            <option value="">Select student</option>
            {students.filter(
              student => student._id === selectedStudentId && !matchingRegistrationStudents.some(item => item._id === student._id)
            ).map(
              student => <option key={student._id} value={student._id}>{student.studentId} - {student.name} (selected)</option>
            )}
            {matchingRegistrationStudents.map(
              student => <option key={student._id} value={student._id}>{student.studentId} - {student.name}</option>
            )}
          </select>
        </label>
        {matchingRegistrationStudents.length === 0 && <p className="small-text">No matching students found.</p>}
        {loadingStudent && <p>Loading student record and eligibility...</p>}
        {selectedStudentId &&
          <div className="button-row"><button
              type="button"
              className="secondary"
              onClick={() => navigate("student-details", `student=${encodeURIComponent(selectedStudentId)}`)}
            >View student's academic profile</button></div>}
        {record &&
          <div className="summary-grid">
            <div><strong>Student:</strong> {record.student.name}</div>
            <div><strong>ID:</strong> {record.student.studentId}</div>
            <div><strong>Earned credits:</strong> {record.totalCreditsEarned}</div>
            <div><strong>Advisor:</strong> {record.advisor ? `${record.advisor.name} (${record.advisor.email})` : "Not configured"}</div>
          </div>}
        {record?.records?.length > 0 &&
          <>
            <h3>Academic record</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Term</th><th>Course</th><th>Title</th><th>Grade</th><th>Status</th></tr></thead>
                <tbody>{record.records.map(
                    item => <tr key={item._id}>
                      <td>{item.term}</td>
                      <td>{item.courseCode}</td>
                      <td>{item.title}</td>
                      <td>{item.grade}</td>
                      <td>{item.retakeRequired ? "Retake required" : item.grade === "F" ? "Retake completed" : "-"}</td>
                    </tr>
                  )}</tbody>
              </table>
            </div>
          </>}
        {eligibility &&
          <>
            <div className="section-heading">
              <h3>Eligible sections for {eligibility.term}</h3>
              {eligibility.termFinalised && <span className="badge">Term finalised</span>}
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr>
                    <th>Select</th>
                    <th>Course</th>
                    <th>Section</th>
                    <th>Schedule</th>
                    <th>Seats</th>
                    <th>Retake</th>
                    <th>Reason</th>
                  </tr></thead>
                <tbody>
                  {eligibility.sections.map(
                    section => {
                      const checked = selectedOfferingIds.includes(section._id);
                      return <tr key={section._id} className={!section.selectable ? "disabled-row" : ""}>
                        <td><input
                            type="checkbox"
                            checked={checked}
                            disabled={!section.selectable && !checked || eligibility.termFinalised}
                            onChange={() => toggleSelection(section._id)}
                          /></td>
                        <td>{section.courseCode} - {section.title}</td>
                        <td>{section.section}</td>
                        <td>{section.day} {section.startTime}-{section.endTime}</td>
                        <td>{section.seatsRemaining}</td>
                        <td>{section.retakeRequired ? "Retake required" : "-"}</td>
                        <td>{section.reasons.length ? section.reasons.join("; ") : "Eligible"}</td>
                      </tr>;
                    }
                  )}
                </tbody>
              </table>
            </div>
            {eligibility.unavailableCourses.length > 0 &&
              <div className="muted-box">
                <strong>Not offered this term:</strong>
                <ul>{eligibility.unavailableCourses.map(
                    course => <li key={course.courseId}>{course.courseCode} - {course.title}{course.retakeRequired ? " (Retake required)" : ""}: {course.reason}</li>
                  )}</ul>
              </div>}
            <div className="button-row">
              <button
                type="button"
                onClick={saveRegistrations}
                disabled={saving || loadingStudent || termFinalised || selectedOfferingIds.length === 0 || !selectionValid}
              >
                {saving ? "Saving..." : "Confirm registration"}
              </button>
              {selectedOfferingIds.length > 0 && !selectionValid &&
                <span className="small-text">Resolve the listed reasons before saving.</span>}
            </div>
          </>}
        {registrations &&
          <>
            <h3>Current registrations</h3>
            {registrations.registrations.length === 0
              ? <p>No current registrations.</p>
              : <div className="table-wrap">
                <table>
                  <thead><tr>
                      <th>Course</th>
                      <th>Section</th>
                      <th>Schedule</th>
                      <th>Room</th>
                      <th>Instructor</th>
                      <th>Add/Drop</th>
                      <th>Action</th>
                    </tr></thead>
                  <tbody>{registrations.registrations.map(
                      registration => <tr key={registration._id}>
                        <td>{registration.offering.courseCode} - {registration.offering.title}</td>
                        <td>{registration.offering.section}</td>
                        <td>{registration.offering.day} {registration.offering.startTime}-{registration.offering.endTime}</td>
                        <td>{registration.offering.room}</td>
                        <td>{registration.offering.instructor}</td>
                        <td>{registration.offering.addDropIsOpen ? "Open" : "Closed"}</td>
                        <td><button
                            type="button"
                            className="danger"
                            disabled={saving || registrations.termFinalised}
                            onClick={() => removeRegistration(registration)}
                          >Remove</button></td>
                      </tr>
                    )}</tbody>
                </table>
              </div>}
          </>}
      </section>}
  </>;
}