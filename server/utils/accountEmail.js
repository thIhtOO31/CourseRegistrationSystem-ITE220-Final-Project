// Create an academic email address
function accountEmail({
  name,
  role,
  studentId
}) {
  if (role === "admin") return "admin@admin.wakanda.forever";
  if (role === "student") return `${String(studentId || "").trim().toLowerCase()}@student.wakanda.forever`;
  if (role === "advisor") {
    const slug = String(name || "").trim().toLowerCase().replace(/\s+/g, ".");
    return `${slug}@advisor.wakanda.forever`;
  }
  return "";
}

// Check a name and email match the account type
function validateAccountIdentity({
  name,
  email,
  role,
  studentId
}) {
  if (role === "admin" && name !== "Admin") return "Administrator name must be Admin";
  if (role === "advisor" && !/^[a-z]+(?: [a-z]+)+$/i.test(name))
    return "Advisor needs a first and last name using letters";
  if (role === "student" && !/^[a-z0-9-]+$/i.test(studentId || "")) return "Invalid student ID";
  if (email.trim().toLowerCase() !== accountEmail({
    name,
    role,
    studentId
  })) {
    return `Email must be ${accountEmail({
      name,
      role,
      studentId
    })}`;
  }
  return null;
}

module.exports = {accountEmail, validateAccountIdentity};