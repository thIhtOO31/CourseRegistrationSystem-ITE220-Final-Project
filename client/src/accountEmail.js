// Create a university email based on account details
export function accountEmail({
  name,
  role,
  studentId
}) {
  if (role === "admin") 
    return "admin@admin.wakanda.forever";

  if (role === "student") 
    return `${(studentId || "").trim().toLowerCase()}@student.wakanda.forever`;

  if (role === "advisor") 
    return `${(name || "").trim().toLowerCase().replace(/\s+/g, ".")}@advisor.wakanda.forever`;
  
  return "";
}