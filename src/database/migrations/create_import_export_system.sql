-- Advanced Data Import/Export Engine Database Schema
-- Comprehensive system for intelligent data import, validation, and export

-- ============================================
-- Import/Export Job Management
-- ============================================

-- Import/Export job tracking
CREATE TABLE IF NOT EXISTS import_export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Job metadata
    job_type VARCHAR(20) NOT NULL CHECK (job_type IN ('IMPORT', 'EXPORT')),
    status VARCHAR(20) NOT NULL DEFAULT 'QUEUED' CHECK (status IN (
        'QUEUED', 'PROCESSING', 'VALIDATING', 'APPLYING', 
        'COMPLETED', 'FAILED', 'CANCELLED', 'PARTIALLY_COMPLETED'
    )),
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN (
        'STAKEHOLDERS_IMPORT', 'SECURITIES_IMPORT', 'TRANSACTIONS_IMPORT', 
        'VESTING_SCHEDULES_IMPORT', 'COMPLETE_CAP_TABLE_IMPORT',
        'STAKEHOLDERS_EXPORT', 'SECURITIES_EXPORT', 'TRANSACTIONS_EXPORT',
        'CAP_TABLE_EXPORT', 'BOARD_PACKAGE_EXPORT', 'TAX_FORMS_EXPORT'
    )),
    
    -- File information
    source_file_name VARCHAR(255),
    source_file_path TEXT,
    source_file_size BIGINT,
    source_file_type VARCHAR(50), -- CSV, XLSX, JSON, PDF
    destination_file_path TEXT,
    
    -- Processing configuration
    import_config JSONB DEFAULT '{}', -- Mapping rules, validation settings
    export_config JSONB DEFAULT '{}', -- Format settings, filters
    
    -- Progress tracking
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    valid_records INTEGER DEFAULT 0,
    invalid_records INTEGER DEFAULT 0,
    imported_records INTEGER DEFAULT 0,
    skipped_records INTEGER DEFAULT 0,
    
    -- Results and errors
    validation_results JSONB DEFAULT '{}',
    import_summary JSONB DEFAULT '{}',
    error_details JSONB DEFAULT '{}',
    warnings JSONB DEFAULT '[]',
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_completion_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data mapping templates for common import formats
CREATE TABLE IF NOT EXISTS import_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Template metadata
    name VARCHAR(200) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) NOT NULL CHECK (template_type IN (
        'STAKEHOLDERS', 'SECURITIES', 'TRANSACTIONS', 'VESTING_SCHEDULES', 'CAP_TABLE_COMPLETE'
    )),
    
    -- Template configuration
    field_mappings JSONB NOT NULL DEFAULT '{}', -- Source field -> Target field mapping
    validation_rules JSONB NOT NULL DEFAULT '{}', -- Custom validation rules
    transformation_rules JSONB NOT NULL DEFAULT '{}', -- Data transformation rules
    default_values JSONB NOT NULL DEFAULT '{}', -- Default values for missing fields
    
    -- Usage and performance
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,4) DEFAULT 1.0000,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Sharing and permissions
    is_public BOOLEAN DEFAULT FALSE, -- Available to all companies
    is_system_template BOOLEAN DEFAULT FALSE, -- Built-in template
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_company_template_name UNIQUE (company_id, name)
);

-- Record-level import validation results
CREATE TABLE IF NOT EXISTS import_validation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES import_export_jobs(id) ON DELETE CASCADE,
    
    -- Record identification
    row_number INTEGER NOT NULL,
    source_data JSONB NOT NULL, -- Original row data
    mapped_data JSONB, -- Data after field mapping
    transformed_data JSONB, -- Data after transformation
    
    -- Validation results
    is_valid BOOLEAN DEFAULT FALSE,
    validation_errors JSONB DEFAULT '[]', -- Array of validation errors
    validation_warnings JSONB DEFAULT '[]', -- Array of warnings
    
    -- Import status
    import_status VARCHAR(20) CHECK (import_status IN ('PENDING', 'IMPORTED', 'SKIPPED', 'FAILED')),
    target_entity_type VARCHAR(50), -- 'stakeholder', 'security', 'transaction', etc.
    target_entity_id UUID, -- ID of created/updated entity
    
    -- Conflict resolution
    conflicts JSONB DEFAULT '[]', -- Detected conflicts with existing data
    resolution_strategy VARCHAR(20) CHECK (resolution_strategy IN ('SKIP', 'OVERWRITE', 'MERGE', 'CREATE_NEW')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data transformation and mapping definitions
CREATE TABLE IF NOT EXISTS data_transformations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    
    -- Transformation details
    input_type VARCHAR(50) NOT NULL, -- 'string', 'number', 'date', 'boolean', 'currency'
    output_type VARCHAR(50) NOT NULL,
    transformation_function TEXT NOT NULL, -- JavaScript function or SQL expression
    validation_pattern VARCHAR(500), -- Regex pattern for validation
    
    -- Examples and testing
    examples JSONB DEFAULT '[]', -- Example input/output pairs
    test_cases JSONB DEFAULT '[]',
    
    is_system_function BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Export template definitions
CREATE TABLE IF NOT EXISTS export_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Template metadata
    name VARCHAR(200) NOT NULL,
    description TEXT,
    export_type VARCHAR(50) NOT NULL CHECK (export_type IN (
        'CAP_TABLE', 'STAKEHOLDER_REPORT', 'EQUITY_SUMMARY', 'TRANSACTION_HISTORY',
        'VESTING_SCHEDULE', 'BOARD_PACKAGE', 'TAX_FORMS', 'CUSTOM_REPORT'
    )),
    
    -- Output configuration
    output_format VARCHAR(20) NOT NULL CHECK (output_format IN ('CSV', 'XLSX', 'PDF', 'JSON')),
    template_config JSONB NOT NULL DEFAULT '{}', -- Formatting, styling, layout options
    
    -- Data selection and filtering
    data_filters JSONB DEFAULT '{}', -- Filters for data selection
    field_selections JSONB DEFAULT '{}', -- Which fields to include
    sort_configuration JSONB DEFAULT '{}', -- Sorting and grouping
    
    -- Scheduling and automation
    is_scheduled BOOLEAN DEFAULT FALSE,
    schedule_config JSONB, -- Cron expression and settings
    last_executed_at TIMESTAMP WITH TIME ZONE,
    next_execution_at TIMESTAMP WITH TIME ZONE,
    
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_company_export_template_name UNIQUE (company_id, name)
);

-- ============================================
-- Real-time Collaboration Infrastructure
-- ============================================

-- Active collaboration sessions
CREATE TABLE IF NOT EXISTS collaboration_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Session metadata
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN (
        'COMPANY', 'STAKEHOLDER', 'SECURITY', 'TRANSACTION', 'REPORT', 
        'IMPORT_JOB', 'CAP_TABLE_VIEW', 'BOARD_MEETING'
    )),
    resource_id UUID NOT NULL,
    session_name VARCHAR(200),
    
    -- Session state
    is_active BOOLEAN DEFAULT TRUE,
    participants_count INTEGER DEFAULT 0,
    
    -- Collaboration features enabled
    features_enabled JSONB DEFAULT '{
        "editing": true,
        "commenting": true,
        "cursor_tracking": true,
        "voice_chat": false,
        "screen_sharing": false
    }',
    
    -- Session data
    shared_state JSONB DEFAULT '{}', -- Current state being collaborated on
    locked_fields JSONB DEFAULT '[]', -- Fields currently being edited
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours'
);

-- Session participants and their roles
CREATE TABLE IF NOT EXISTS collaboration_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Participant details
    participant_name VARCHAR(200) NOT NULL,
    participant_role VARCHAR(50) CHECK (participant_role IN ('OWNER', 'EDITOR', 'REVIEWER', 'VIEWER')),
    participant_color VARCHAR(7), -- Hex color for cursor/highlights
    
    -- Presence information
    is_online BOOLEAN DEFAULT FALSE,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cursor_position JSONB, -- Current cursor/selection position
    current_view JSONB, -- Current view/screen information
    
    -- Permissions
    can_edit BOOLEAN DEFAULT FALSE,
    can_comment BOOLEAN DEFAULT TRUE,
    can_invite BOOLEAN DEFAULT FALSE,
    can_manage_session BOOLEAN DEFAULT FALSE,
    
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT unique_session_participant UNIQUE (session_id, user_id)
);

-- Real-time activity feed
CREATE TABLE IF NOT EXISTS collaboration_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Activity details
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
        'USER_JOINED', 'USER_LEFT', 'FIELD_EDITED', 'COMMENT_ADDED', 'COMMENT_RESOLVED',
        'DATA_IMPORTED', 'REPORT_GENERATED', 'APPROVAL_REQUESTED', 'APPROVAL_GRANTED',
        'FILE_UPLOADED', 'TEMPLATE_APPLIED', 'VALIDATION_COMPLETED', 'CONFLICT_DETECTED'
    )),
    
    -- Activity data
    activity_data JSONB NOT NULL DEFAULT '{}',
    affected_resource_type VARCHAR(50),
    affected_resource_id UUID,
    affected_field_path VARCHAR(500), -- JSONPath to the affected field
    
    -- Change tracking
    old_value JSONB,
    new_value JSONB,
    change_summary TEXT,
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments and discussions
CREATE TABLE IF NOT EXISTS collaboration_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Comment metadata
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    field_path VARCHAR(500), -- Specific field/location being commented on
    
    -- Comment content
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'TEXT' CHECK (content_type IN ('TEXT', 'HTML', 'MARKDOWN')),
    mentions JSONB DEFAULT '[]', -- Array of mentioned user IDs
    attachments JSONB DEFAULT '[]', -- File attachments
    
    -- Comment thread
    parent_comment_id UUID REFERENCES collaboration_comments(id),
    thread_id UUID, -- Root comment ID for threading
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Priority and categorization
    priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    category VARCHAR(50) CHECK (category IN ('QUESTION', 'SUGGESTION', 'ISSUE', 'APPROVAL', 'GENERAL')),
    
    -- Reactions and engagement
    reactions JSONB DEFAULT '{}', -- Emoji reactions with user counts
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Approval workflows
CREATE TABLE IF NOT EXISTS collaboration_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Approval metadata
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    approval_type VARCHAR(50) NOT NULL CHECK (approval_type IN (
        'DATA_IMPORT', 'EQUITY_ISSUANCE', 'TRANSACTION_ENTRY', 'STAKEHOLDER_UPDATE',
        'REPORT_PUBLICATION', 'TEMPLATE_CHANGE', 'USER_PERMISSION', 'SYSTEM_SETTING'
    )),
    
    -- Approval details
    title VARCHAR(200) NOT NULL,
    description TEXT,
    justification TEXT,
    risk_level VARCHAR(20) CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    -- Approval requirements
    required_approvers JSONB NOT NULL, -- Array of required approver user IDs or roles
    optional_approvers JSONB DEFAULT '[]',
    minimum_approvals INTEGER DEFAULT 1,
    
    -- Current status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'
    )),
    
    -- Approval responses
    approvals JSONB DEFAULT '[]', -- Array of approval responses
    rejections JSONB DEFAULT '[]', -- Array of rejection responses
    
    -- Timing
    deadline TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    
    -- Change preview
    changes_preview JSONB, -- Preview of changes that will be applied
    rollback_data JSONB, -- Data needed to rollback if necessary
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File sharing and version control
CREATE TABLE IF NOT EXISTS collaboration_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- File metadata
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64) UNIQUE, -- SHA-256 hash for deduplication
    
    -- File organization
    folder_path VARCHAR(500) DEFAULT '/shared',
    resource_type VARCHAR(50), -- Associated resource type
    resource_id UUID, -- Associated resource ID
    
    -- Version control
    version INTEGER DEFAULT 1,
    is_latest_version BOOLEAN DEFAULT TRUE,
    parent_file_id UUID REFERENCES collaboration_files(id), -- Previous version
    
    -- Access control
    access_level VARCHAR(20) DEFAULT 'COMPANY' CHECK (access_level IN ('PRIVATE', 'TEAM', 'COMPANY', 'PUBLIC')),
    allowed_users JSONB DEFAULT '[]', -- Specific user access if private
    
    -- File processing
    processing_status VARCHAR(20) DEFAULT 'PENDING' CHECK (processing_status IN (
        'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
    )),
    extracted_metadata JSONB DEFAULT '{}',
    thumbnail_path TEXT,
    preview_available BOOLEAN DEFAULT FALSE,
    
    -- Usage tracking
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    
    -- Lifecycle
    expires_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time notifications
CREATE TABLE IF NOT EXISTS collaboration_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Notification details
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'MENTION', 'COMMENT_REPLY', 'APPROVAL_REQUEST', 'APPROVAL_RESPONSE',
        'IMPORT_COMPLETED', 'IMPORT_FAILED', 'SESSION_INVITE', 'FILE_SHARED',
        'DEADLINE_APPROACHING', 'CONFLICT_DETECTED', 'DATA_VALIDATION_ERROR'
    )),
    
    -- Notification content
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    action_text VARCHAR(50),
    
    -- Related entities
    related_session_id UUID REFERENCES collaboration_sessions(id),
    related_comment_id UUID REFERENCES collaboration_comments(id),
    related_approval_id UUID REFERENCES collaboration_approvals(id),
    related_file_id UUID REFERENCES collaboration_files(id),
    
    -- Delivery status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    is_email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Priority and grouping
    priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    notification_group VARCHAR(100), -- For grouping related notifications
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days'
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Import/Export indexes
CREATE INDEX IF NOT EXISTS idx_import_export_jobs_company_status ON import_export_jobs(company_id, status);
CREATE INDEX IF NOT EXISTS idx_import_export_jobs_created_by ON import_export_jobs(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_export_jobs_type_status ON import_export_jobs(job_type, status);
CREATE INDEX IF NOT EXISTS idx_import_validation_records_job_id ON import_validation_records(job_id, row_number);
CREATE INDEX IF NOT EXISTS idx_import_templates_company_type ON import_templates(company_id, template_type);
CREATE INDEX IF NOT EXISTS idx_import_templates_public ON import_templates(template_type) WHERE is_public = TRUE;

-- Collaboration indexes
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_company_active ON collaboration_sessions(company_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_resource ON collaboration_sessions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_participants_session ON collaboration_participants(session_id, is_online);
CREATE INDEX IF NOT EXISTS idx_collaboration_participants_user ON collaboration_participants(user_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaboration_activities_session_created ON collaboration_activities(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaboration_activities_company_type ON collaboration_activities(company_id, activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaboration_comments_session ON collaboration_comments(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaboration_comments_resource ON collaboration_comments(resource_type, resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaboration_comments_user ON collaboration_comments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaboration_comments_unresolved ON collaboration_comments(resource_type, resource_id) WHERE is_resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_collaboration_approvals_company_status ON collaboration_approvals(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaboration_approvals_resource ON collaboration_approvals(resource_type, resource_id, status);
CREATE INDEX IF NOT EXISTS idx_collaboration_files_company_folder ON collaboration_files(company_id, folder_path);
CREATE INDEX IF NOT EXISTS idx_collaboration_files_resource ON collaboration_files(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_files_hash ON collaboration_files(file_hash);
CREATE INDEX IF NOT EXISTS idx_collaboration_notifications_user_unread ON collaboration_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaboration_notifications_type_created ON collaboration_notifications(notification_type, created_at DESC);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS
ALTER TABLE import_export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_validation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_notifications ENABLE ROW LEVEL SECURITY;

-- Import/Export policies
CREATE POLICY "Users can access their company's import/export jobs" ON import_export_jobs
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access their company's templates" ON import_templates
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid()
        ) OR is_public = TRUE
    );

CREATE POLICY "Users can access public export templates" ON export_templates
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid()
        )
    );

-- Collaboration policies
CREATE POLICY "Users can access their company's collaboration sessions" ON collaboration_sessions
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can see session participants" ON collaboration_participants
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM collaboration_sessions cs
            WHERE cs.company_id IN (
                SELECT company_id FROM company_users 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can join/leave sessions" ON collaboration_participants
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation" ON collaboration_participants
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can access their company's collaboration activities" ON collaboration_activities
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create activities in their company" ON collaboration_activities
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        company_id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access their company's comments" ON collaboration_comments
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access their company's approvals" ON collaboration_approvals
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can access their company's files" ON collaboration_files
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid()
        ) AND (
            access_level = 'COMPANY' OR
            (access_level = 'PRIVATE' AND uploaded_by = auth.uid()) OR
            (access_level = 'PRIVATE' AND auth.uid()::text = ANY(SELECT jsonb_array_elements_text(allowed_users)))
        )
    );

CREATE POLICY "Users can see their own notifications" ON collaboration_notifications
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- Utility Functions
-- ============================================

-- Function to create collaboration session
CREATE OR REPLACE FUNCTION create_collaboration_session(
    p_company_id UUID,
    p_resource_type VARCHAR(50),
    p_resource_id UUID,
    p_session_name VARCHAR(200) DEFAULT NULL,
    p_features JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    INSERT INTO collaboration_sessions (
        company_id, resource_type, resource_id, session_name, features_enabled
    ) VALUES (
        p_company_id, p_resource_type, p_resource_id, 
        COALESCE(p_session_name, p_resource_type || ' Collaboration'),
        COALESCE(p_features, '{"editing": true, "commenting": true, "cursor_tracking": true}')
    ) RETURNING id INTO v_session_id;
    
    -- Add creator as session owner
    INSERT INTO collaboration_participants (
        session_id, user_id, participant_name, participant_role,
        can_edit, can_comment, can_invite, can_manage_session
    ) SELECT 
        v_session_id, v_user_id, u.full_name, 'OWNER',
        true, true, true, true
    FROM auth.users u WHERE u.id = v_user_id;
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join collaboration session
CREATE OR REPLACE FUNCTION join_collaboration_session(
    p_session_id UUID,
    p_role VARCHAR(50) DEFAULT 'VIEWER'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_user_name TEXT;
    v_session_exists BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    -- Check if session exists and is active
    SELECT EXISTS(
        SELECT 1 FROM collaboration_sessions 
        WHERE id = p_session_id AND is_active = TRUE
    ) INTO v_session_exists;
    
    IF NOT v_session_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Get user name
    SELECT full_name INTO v_user_name FROM auth.users WHERE id = v_user_id;
    
    -- Join session (upsert)
    INSERT INTO collaboration_participants (
        session_id, user_id, participant_name, participant_role,
        can_edit, can_comment, is_online
    ) VALUES (
        p_session_id, v_user_id, v_user_name, p_role,
        p_role IN ('OWNER', 'EDITOR'),
        p_role IN ('OWNER', 'EDITOR', 'REVIEWER'),
        TRUE
    ) ON CONFLICT (session_id, user_id) DO UPDATE SET
        is_online = TRUE,
        last_seen_at = NOW();
    
    -- Update session participant count
    UPDATE collaboration_sessions 
    SET participants_count = (
        SELECT COUNT(*) FROM collaboration_participants 
        WHERE session_id = p_session_id AND is_online = TRUE
    )
    WHERE id = p_session_id;
    
    -- Log activity
    INSERT INTO collaboration_activities (
        session_id, user_id, company_id, activity_type, activity_data
    ) SELECT 
        p_session_id, v_user_id, cs.company_id, 'USER_JOINED',
        jsonb_build_object('user_name', v_user_name, 'role', p_role)
    FROM collaboration_sessions cs WHERE cs.id = p_session_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update import job progress
CREATE OR REPLACE FUNCTION update_import_job_progress(
    p_job_id UUID,
    p_processed_records INTEGER,
    p_valid_records INTEGER,
    p_invalid_records INTEGER,
    p_status VARCHAR(20) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE import_export_jobs SET
        processed_records = p_processed_records,
        valid_records = p_valid_records,
        invalid_records = p_invalid_records,
        status = COALESCE(p_status, status),
        updated_at = NOW()
    WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON import_export_jobs TO authenticated;
GRANT ALL ON import_templates TO authenticated;
GRANT ALL ON import_validation_records TO authenticated;
GRANT ALL ON data_transformations TO authenticated;
GRANT ALL ON export_templates TO authenticated;
GRANT ALL ON collaboration_sessions TO authenticated;
GRANT ALL ON collaboration_participants TO authenticated;
GRANT ALL ON collaboration_activities TO authenticated;
GRANT ALL ON collaboration_comments TO authenticated;
GRANT ALL ON collaboration_approvals TO authenticated;
GRANT ALL ON collaboration_files TO authenticated;
GRANT ALL ON collaboration_notifications TO authenticated;