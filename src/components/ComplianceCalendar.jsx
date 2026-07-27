
import React, { useState, useEffect } from "react";
import { getCompanyCompliances } from "../api/Complaince/Complainceapi";
import { getSecureItem } from "../utils/secureStorage";

const ComplianceCalendar = ({ compliances = [], onComplianceClick }) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [popupCompliance, setPopupCompliance] = useState(null);
  const [fetchedCompliances, setFetchedCompliances] = useState([]);
  const [companyId, setCompanyId] = useState(() => getSecureItem("selectedCompany")?.CompanyID || null);

  // Re-fetch when company is switched from the dropdown
  useEffect(() => {
    const handler = () => {
      const company = getSecureItem("selectedCompany");
      setCompanyId(company?.CompanyID || null);
    };
    window.addEventListener("company-switched", handler);
    return () => window.removeEventListener("company-switched", handler);
  }, []);

  // Fetch compliances from API using secureStorage selectedCompany
  useEffect(() => {
    if (!companyId) return;
    async function fetchData() {
      const data = await getCompanyCompliances(companyId);
      setFetchedCompliances(data);
    }
    fetchData();
  }, [companyId]);

  // Use fetched compliances if available
  const compliancesToShow = fetchedCompliances.length > 0 ? fetchedCompliances : compliances;

  // API returns scoreWeight aliased as `score`; fall back to scoreWeight for safety
  const getWeight = (c) => Number(c.score ?? c.scoreWeight ?? 0);

  const totalScoreWeight = compliancesToShow.reduce((sum, c) => sum + getWeight(c), 0);
  const achievedScore = compliancesToShow.reduce((sum, c) => {
    if (c.status && c.status.toLowerCase() === "filed") {
      return sum + getWeight(c);
    }
    return sum;
  }, 0);

  const calculatedValue = totalScoreWeight > 0 ? (achievedScore / totalScoreWeight) * 100 : 0;

  // Animate needle smoothly when value changes
  useEffect(() => {
    let start = animatedValue;
    let end = calculatedValue;
    let step = (end - start) / 60; // smoother steps
    let current = start;

    const interval = setInterval(() => {
      current += step;
      if ((step > 0 && current >= end) || (step < 0 && current <= end)) {
        current = end;
        clearInterval(interval);
      }
      setAnimatedValue(current);
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [calculatedValue]);

  // Gauge config (improved calculation and visual)
  const totalSegments = 60;
  const minValue = 0;
  const maxValue = 100;
  const gaugeStart = -135;
  const gaugeEnd = 135;
  const gaugeRange = gaugeEnd - gaugeStart;
  const valuePercent = Math.max(0, Math.min(1, (animatedValue - minValue) / (maxValue - minValue)));
  const filledSegments = Math.round(valuePercent * totalSegments);

  const segments = Array.from({ length: totalSegments }, (_, i) => {
    const angle = gaugeStart + (i / (totalSegments - 1)) * gaugeRange;
    let segmentColor;
    if (i < totalSegments * 0.4) {
      segmentColor = "#ef4444"; // Red (low compliance)
    } else if (i < totalSegments * 0.7) {
      segmentColor = "#f59e0b"; // Yellow/Orange (medium)
    } else {
      segmentColor = "#10b981"; // Green (high compliance)
    }
    return {
      angle,
      color: segmentColor,
      isActive: i < filledSegments,
    };
  });

  // Needle angle based on animated value
  // const needleAngle = gaugeStart + valuePercent * gaugeRange;

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString();
  };

  return (
    <div className="flex flex-col items-center justify-start w-full max-w-xl mx-auto bg-gray-50 rounded-3xl ">
      {/* Title */}
      <h2 className="text-lg font-bold text-gray-600 mb-4">
        Compliance Score
      </h2>


      {/* Gauge */}
      <div className="relative w-70 h-70 flex flex-col items-center justify-center" style={{ transform: 'rotate(-90deg)' }}>
        <svg className="w-full h-full" viewBox="0 0 240 240">
          {/* Segments */}
          {segments.map((segment, index) => {
            const innerRadius = 88;
            const outerRadius = 108;
            const angleRad = (segment.angle * Math.PI) / 180;
            const segmentWidth = 3.2;

            const x1 = 120 + innerRadius * Math.cos(angleRad);
            const y1 = 120 + innerRadius * Math.sin(angleRad);
            const x2 = 120 + outerRadius * Math.cos(angleRad);
            const y2 = 120 + outerRadius * Math.sin(angleRad);

            return (
              <line
                key={index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={segment.color}
                strokeWidth={segmentWidth}
                strokeLinecap="round"
                opacity={segment.isActive ? 1 : 0.18}
              />
            );
          })}

          {/* Needle */}
          <g>
            {/* Needle connects to the end of the active segment */}
            {(() => {
              // Find the last active segment (green or filled)
              const lastActive = segments.filter(s => s.isActive).slice(-1)[0];
              if (lastActive) {
                // const innerRadius = 0; // center
                const outerRadius = 108; // same as segment outer
                const angleRad = (lastActive.angle * Math.PI) / 180;
                const x2 = 120 + outerRadius * Math.cos(angleRad);
                const y2 = 120 + outerRadius * Math.sin(angleRad);
                return (
                  <line
                    x1="120"
                    y1="120"
                    x2={x2}
                    y2={y2}
                    stroke="#374151"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                );
              } else {
                // fallback to original needle
                return (
                  <line
                    x1="120"
                    y1="120"
                    x2="120"
                    y2="32"
                    stroke="#374151"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                );
              }
            })()}
            {/* Needle center */}
            <circle cx="120" cy="120" r="5" fill="#374151" />
            <circle cx="120" cy="120" r="2" fill="white" />
          </g>

          {/* Tick marks */}
          {Array.from({ length: 12 }, (_, i) => {
            const angle = i * 22.5 - 135;
            const angleRad = (angle * Math.PI) / 180;
            const innerRadius = 78;
            const outerRadius = 85;

            const x1 = 120 + innerRadius * Math.cos(angleRad);
            const y1 = 120 + innerRadius * Math.sin(angleRad);
            const x2 = 120 + outerRadius * Math.cos(angleRad);
            const y2 = 120 + outerRadius * Math.sin(angleRad);

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#6b7280"
                strokeWidth="1.5"
              />
            );
          })}
        </svg>
      </div>

      

      {/* Value */}
      <div className="text-center mb-8">
        <div className="text-4xl font-bold text-gray-700 mb-1">
          {calculatedValue.toFixed(1)}%
        </div>
        <div className="text-base text-gray-500 font-medium">Calendar</div>
      
      </div>

      
      {/* Compliance List */}
      <div className="w-full flex flex-col gap-2 mb-6">
        {compliancesToShow.map((c, idx) => (
          <button
            key={c.id || c.compliance_id || idx}
            className="flex justify-between items-center px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-100 hover:bg-yellow-50 transition cursor-pointer"
            onClick={() => setPopupCompliance(c)}
          >
            <span className="font-medium text-gray-700 text-sm">{c.complianceName}</span>
            <span className="text-xs text-gray-500">Due: {formatDate(c.due_date)}</span>
            {c.scoreWeight !== undefined && (
              <span className="ml-2 text-xs text-blue-500">Score: {c.scoreWeight}</span>
            )}
          </button>
        ))}
      </div>

      {/* Popup for compliance details */}
      {popupCompliance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-xl shadow-lg p-6 min-w-[320px] max-w-[90vw] relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl font-bold"
              onClick={() => setPopupCompliance(null)}
            >
              ×
            </button>
            <h3 className="text-lg font-semibold mb-2 text-gray-800">{popupCompliance.complianceName}</h3>
            <div className="mb-2 text-sm text-gray-600">Due Date: {formatDate(popupCompliance.due_date)}</div>
            <div className="mb-2 text-sm text-gray-600">Status: {popupCompliance.status}</div>

            {popupCompliance.scoreWeight !== undefined && (
              <div className="mb-2 text-sm text-gray-600">Score Weight: {popupCompliance.scoreWeight}</div>
            )}
            {popupCompliance.period && (
              <div className="mb-2 text-sm text-gray-600">Period: {popupCompliance.period}</div>
            )}
            {popupCompliance.periodType && (
              <div className="mb-2 text-sm text-gray-600">Period Type: {popupCompliance.periodType}</div>
            )}
            {popupCompliance.dateType && (
              <div className="mb-2 text-sm text-gray-600">Date Type: {popupCompliance.dateType}</div>
            )}
            {/* Add more details as needed */}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceCalendar;