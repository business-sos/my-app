export default function AlertBanner({ alert }) {
  return (
    <div className={`alert ${alert.severity}`}>
      {alert.message}
    </div>
  );
}
