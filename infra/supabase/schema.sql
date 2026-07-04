CREATE TABLE organizations (
	id UUID NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	slug VARCHAR(80) NOT NULL, 
	logo_url VARCHAR(500), 
	primary_color VARCHAR(9) NOT NULL, 
	accent_color VARCHAR(9) NOT NULL, 
	industry VARCHAR(80), 
	plan VARCHAR(40) NOT NULL, 
	settings JSONB NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_organizations_slug ON organizations (slug);

CREATE TABLE users (
	id UUID NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	full_name VARCHAR(200), 
	hashed_password VARCHAR(255) NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	is_superuser BOOLEAN NOT NULL, 
	email_verified BOOLEAN NOT NULL, 
	last_login_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_users_email ON users (email);

CREATE TABLE assets (
	id UUID NOT NULL, 
	org_id UUID NOT NULL, 
	external_id VARCHAR(120), 
	name VARCHAR(200) NOT NULL, 
	asset_type VARCHAR(30) NOT NULL, 
	latitude FLOAT, 
	longitude FLOAT, 
	geometry JSONB, 
	voltage_kv FLOAT, 
	capacity_amps FLOAT, 
	commissioning_year INTEGER, 
	region VARCHAR(120), 
	asset_metadata JSONB NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(org_id) REFERENCES organizations (id) ON DELETE CASCADE
);

CREATE INDEX ix_assets_org_extid ON assets (org_id, external_id);

CREATE INDEX ix_assets_org_type ON assets (org_id, asset_type);

CREATE INDEX ix_assets_org_id ON assets (org_id);

CREATE TABLE audit_logs (
	id UUID NOT NULL, 
	org_id UUID, 
	user_id UUID, 
	user_email VARCHAR(255), 
	action VARCHAR(80) NOT NULL, 
	resource VARCHAR(120), 
	ip_address VARCHAR(64), 
	user_agent VARCHAR(400), 
	details JSONB, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(org_id) REFERENCES organizations (id) ON DELETE SET NULL, 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_audit_logs_user_id ON audit_logs (user_id);

CREATE INDEX ix_audit_logs_org_id ON audit_logs (org_id);

CREATE TABLE batches (
	id UUID NOT NULL, 
	org_id UUID NOT NULL, 
	created_by UUID, 
	name VARCHAR(200), 
	total INTEGER NOT NULL, 
	critical_count INTEGER NOT NULL, 
	warning_count INTEGER NOT NULL, 
	normal_count INTEGER NOT NULL, 
	failed_count INTEGER NOT NULL, 
	combined_report_path VARCHAR(500), 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(org_id) REFERENCES organizations (id) ON DELETE CASCADE, 
	FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_batches_org_id ON batches (org_id);

CREATE TABLE email_verification_tokens (
	id UUID NOT NULL, 
	user_id UUID NOT NULL, 
	token_hash VARCHAR(64) NOT NULL, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	used BOOLEAN NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_email_verification_tokens_user_id ON email_verification_tokens (user_id);

CREATE UNIQUE INDEX ix_email_verification_tokens_token_hash ON email_verification_tokens (token_hash);

CREATE TABLE memberships (
	id UUID NOT NULL, 
	user_id UUID NOT NULL, 
	org_id UUID NOT NULL, 
	role VARCHAR(20) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_membership_user_org UNIQUE (user_id, org_id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(org_id) REFERENCES organizations (id) ON DELETE CASCADE
);

CREATE INDEX ix_memberships_user_id ON memberships (user_id);

CREATE INDEX ix_memberships_org_id ON memberships (org_id);

CREATE TABLE password_reset_tokens (
	id UUID NOT NULL, 
	user_id UUID NOT NULL, 
	token_hash VARCHAR(64) NOT NULL, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	used BOOLEAN NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_password_reset_tokens_user_id ON password_reset_tokens (user_id);

CREATE UNIQUE INDEX ix_password_reset_tokens_token_hash ON password_reset_tokens (token_hash);

CREATE TABLE refresh_tokens (
	id UUID NOT NULL, 
	user_id UUID NOT NULL, 
	token_hash VARCHAR(64) NOT NULL, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	revoked BOOLEAN NOT NULL, 
	user_agent VARCHAR(400), 
	ip_address VARCHAR(64), 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_refresh_tokens_user_id ON refresh_tokens (user_id);

CREATE UNIQUE INDEX ix_refresh_tokens_token_hash ON refresh_tokens (token_hash);

CREATE TABLE inspections (
	id UUID NOT NULL, 
	org_id UUID NOT NULL, 
	batch_id UUID, 
	asset_id UUID, 
	created_by UUID, 
	original_filename VARCHAR(300), 
	image_path VARCHAR(500), 
	thumbnail_path VARCHAR(500), 
	captured_at TIMESTAMP WITHOUT TIME ZONE, 
	latitude FLOAT, 
	longitude FLOAT, 
	distance_km FLOAT, 
	measured_temp FLOAT, 
	ambient_temp FLOAT, 
	delta_t FLOAT, 
	threshold_used FLOAT, 
	confidence FLOAT, 
	fault_level VARCHAR(20), 
	priority VARCHAR(20), 
	analysis_status VARCHAR(20) NOT NULL, 
	failure_reason VARCHAR(500), 
	analysis_json JSONB, 
	ai_summary TEXT, 
	report_path VARCHAR(500), 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(org_id) REFERENCES organizations (id) ON DELETE CASCADE, 
	FOREIGN KEY(batch_id) REFERENCES batches (id) ON DELETE SET NULL, 
	FOREIGN KEY(asset_id) REFERENCES assets (id) ON DELETE SET NULL, 
	FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_inspections_org_id ON inspections (org_id);

CREATE INDEX ix_inspections_org_fault ON inspections (org_id, fault_level);

CREATE INDEX ix_inspections_org_created ON inspections (org_id, created_at);

CREATE INDEX ix_inspections_batch_id ON inspections (batch_id);

CREATE INDEX ix_inspections_asset_id ON inspections (asset_id);

CREATE TABLE alerts (
	id UUID NOT NULL, 
	org_id UUID NOT NULL, 
	inspection_id UUID, 
	channel VARCHAR(20) NOT NULL, 
	level VARCHAR(20), 
	subject VARCHAR(300), 
	recipients JSONB NOT NULL, 
	ok BOOLEAN NOT NULL, 
	error TEXT, 
	meta JSONB, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(org_id) REFERENCES organizations (id) ON DELETE CASCADE, 
	FOREIGN KEY(inspection_id) REFERENCES inspections (id) ON DELETE SET NULL
);

CREATE INDEX ix_alerts_inspection_id ON alerts (inspection_id);

CREATE INDEX ix_alerts_org_id ON alerts (org_id);
