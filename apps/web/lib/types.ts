// Shared API types — mirror the FastAPI Pydantic schemas (apps/api/app/schemas).

export type FaultLevel = "CRITICAL" | "WARNING" | "NORMAL";
export type AnalysisStatus = "pending" | "processing" | "completed" | "failed";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserOut {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  email_verified: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface Me {
  user: UserOut;
  active_org_id: string | null;
  active_role: string | null;
  organizations: OrgSummary[];
}

export interface Thresholds {
  warning_delta: number;
  critical_delta: number;
  warning_abs: number;
  critical_abs: number;
}

export interface OrgSettings {
  thresholds: Thresholds;
  threshold_profiles?: Record<string, Thresholds>;
  units?: string; // "celsius" | "fahrenheit"
  emissivity?: number;
  currency?: string;
  failure_costs?: Record<string, number>;
  timezone?: string;
  alert_recipients?: string[];
  alerts_enabled: boolean;
  map?: { center?: [number, number]; zoom?: number };
}

export interface TrendPoint {
  date: string;
  total: number;
  critical: number;
  warning: number;
  normal: number;
  avg_temp: number | null;
}

export interface TrendResponse {
  points: TrendPoint[];
  max_temp: number | null;
  hottest_asset: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  industry: string | null;
  plan: string;
  settings: OrgSettings;
  created_at: string;
}

export interface Member {
  id: string; // membership id
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

export interface Inspection {
  id: string;
  org_id: string;
  batch_id: string | null;
  asset_id: string | null;
  original_filename: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  captured_at: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_km: number | null;
  measured_temp: number | null;
  ambient_temp: number | null;
  delta_t: number | null;
  threshold_used: number | null;
  confidence: number | null;
  fault_level: FaultLevel | null;
  priority: string | null;
  analysis_status: AnalysisStatus;
  failure_reason: string | null;
  ai_summary: string | null;
  created_at: string;
}

export interface InspectionDetail extends Inspection {
  analysis_json: Record<string, unknown> | null;
  asset_name: string | null;
  report_url: string | null;
}

export interface Asset {
  id: string;
  org_id: string;
  external_id: string | null;
  name: string;
  asset_type: string;
  latitude: number | null;
  longitude: number | null;
  geometry: { type: string; coordinates: unknown } | null;
  voltage_kv: number | null;
  capacity_amps: number | null;
  commissioning_year: number | null;
  region: string | null;
  asset_metadata: Record<string, unknown>;
  created_at: string;
}

export interface DashboardStats {
  total_inspections: number;
  critical_count: number;
  warning_count: number;
  normal_count: number;
  failed_count: number;
  pending_count: number;
  avg_measured_temp: number | null;
  avg_delta_t: number | null;
  last_24h: number;
  total_assets: number;
}

export interface UploadResult {
  batch: {
    id: string;
    total: number;
    critical_count: number;
    warning_count: number;
    normal_count: number;
    failed_count: number;
  } | null;
  inspections: Inspection[];
}

export interface RegisterForm {
  full_name: string;
  organization_name: string;
  email: string;
  password: string;
}

// ── Predictive maintenance ("Insulator Health" / asset forecasting) ──────────
export type HealthTrend = "worsening" | "stable" | "improving" | "insufficient_data";

export interface AssetHealthPoint {
  captured_at: string;
  measured_temp: number | null;
  delta_t: number | null;
  fault_level: FaultLevel | null;
}

export interface AssetHealth {
  asset_id: string;
  asset_name: string;
  external_id: string | null;
  asset_type: string;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  voltage_kv: number | null;

  inspection_count: number;
  first_seen: string | null;
  last_seen: string | null;

  latest_delta_t: number | null;
  latest_fault_level: FaultLevel | null;

  // Trend model (least-squares over ΔT vs time)
  trend: HealthTrend;
  slope_c_per_month: number | null; // °C / month
  r_squared: number | null;

  // Forecast
  health_score: number; // 0..100 (100 = healthy)
  risk_level: FaultLevel | "UNKNOWN";
  predicted_cross_date: string | null; // when ΔT is projected to cross the critical threshold
  months_to_critical: number | null;
  recommendation: string;
  failure_cost: number | null;
  history: AssetHealthPoint[];
}

export interface FleetHealthSummary {
  generated_at: string;
  critical_threshold_delta: number;
  assets_analyzed: number;
  at_risk_count: number;
  worsening_count: number;
  total_inspections: number;
  matched_inspections: number;
  value_at_risk: number;
  currency: string;
  assets: AssetHealth[];
}
