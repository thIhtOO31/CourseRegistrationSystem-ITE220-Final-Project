// Display each page title and its description
export default function PageIntro({
  title,
  description,
  children
}) {
  return <div className="page-intro">
    <div>
            <h1>{title}</h1>
            {description && <p>{description}</p>}</div>
    {children && <div className="button-row">{children}
          </div>}
  </div>;
}