export default function ServiceCard({ type, service, isNearest = false }) {
  if (!service) return null;

  const typeLabel = type === "hospital" ? "Hospital" : "Police Station";
  const typeIcon = type === "hospital" ? "🏥" : "🚓";

  return (
    <div className={`service-card ${isNearest ? "service-card-nearest" : ""}`}>
      <div className="service-card-head">
        <p className="service-card-title">
          <span>{typeIcon}</span> {service.name}
        </p>
        {isNearest ? <span className="service-nearest-badge">Nearest</span> : null}
      </div>
      <p className="service-card-address">{service.address || "Address unavailable"}</p>
      {service.phone ? (
        <a className="service-card-phone" href={`tel:${service.phone}`}>
          {service.phone}
        </a>
      ) : (
        <p className="service-card-phone muted">Contact unavailable</p>
      )}
      <p className="service-card-type">{typeLabel}</p>
    </div>
  );
}

