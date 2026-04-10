import HabitDNA from "../analytics/HabitDNA";
import CorrelationEngine from "../analytics/CorrelationEngine";

function DnaTab({ authFetch }) {
  return (
    <div>
      <div className="analytics-header" style={{ marginBottom: "2rem" }}>
        <h2 className="analytics-title">habit dna</h2>
        <span className="analytics-month">last 90 days</span>
      </div>

      <div style={{ marginBottom: "2.5rem" }}>
        <div className="chart-title" style={{ marginBottom: "1rem" }}>
          dna profiles
        </div>
        <HabitDNA authFetch={authFetch} />
      </div>

      <div
        style={{ borderTop: "0.5px solid var(--border)", paddingTop: "2rem" }}
      >
        <div className="chart-title" style={{ marginBottom: "1rem" }}>
          correlation engine
        </div>
        <CorrelationEngine authFetch={authFetch} />
      </div>
    </div>
  );
}

export default DnaTab;
