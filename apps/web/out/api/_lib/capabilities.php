<?php
/**
 * Bueno Freight OS — Capability registry (GENERATED)
 *
 * Do not edit. Generated from apps/web/src/lib/rbac/capabilities.ts by
 * `npm run rbac:generate`. CI fails if this file drifts from the source.
 */

declare(strict_types=1);

// DIRECT ACCESS GUARD — this file defines classes and must never be requested
// over HTTP. .htaccess covers this, but only when AllowOverride permits it, so
// the check is repeated here where no server configuration can disable it.
if (isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(403);
    exit;
}

final class Capabilities
{
    /** Every capability key the platform understands. */
    public const ALL = [
        'analytics',
        'deals',
        'negotiations',
        'fund_requisitions',
        'fleet',
        'terminal_info',
        'moniya',
        'telemetry',
        'manifest',
        'billing',
        'users',
        'permissions',
        'account',
        'deals.view',
        'deals.create',
        'deals.edit',
        'deals.approve',
        'deals.delete',
        'deals.export',
        'negotiation.view',
        'negotiation.message',
        'negotiation.lock',
        'ops.manifest_view',
        'ops.dispatch',
        'ops.loading_update',
        'ops.unloading_confirm',
        'ops.damage_audit',
        'ops.gps_telemetry',
        'fleet.view',
        'fleet.assign',
        'fleet.maintenance',
        'fleet.register',
        'finance.coa_view',
        'finance.coa_manage',
        'finance.journal_create',
        'finance.deal_costing',
        'finance.invoices_issue',
        'finance.invoices_view_own',
        'finance.payments_record',
        'finance.requisitions_submit',
        'finance.requisitions_approve',
        'finance.requisitions_disburse',
        'finance.statements_view',
        'finance.bank_reconciliation',
        'users.view',
        'users.create',
        'users.edit',
        'users.reset_credentials',
        'users.deactivate',
        'users.delete',
        'system.permissions_edit',
        'system.audit_view',
        'system.purge_data',
    ];

    /** Capability metadata, keyed by capability. */
    public const META = [
        'analytics' => [
            'label' => 'Executive Reports & Analytics',
            'module' => 'screens',
            'kind' => 'tab',
            'sensitive' => false,
        ],
        'deals' => [
            'label' => 'Commercial Deals Desk',
            'module' => 'screens',
            'kind' => 'tab',
            'sensitive' => false,
        ],
        'negotiations' => [
            'label' => 'Client Negotiations Chat',
            'module' => 'screens',
            'kind' => 'tab',
            'sensitive' => false,
        ],
        'fund_requisitions' => [
            'label' => 'Fund Requisitions & Expenses',
            'module' => 'screens',
            'kind' => 'tab',
            'sensitive' => false,
        ],
        'fleet' => [
            'label' => 'Fleet & Rolling Stock',
            'module' => 'screens',
            'kind' => 'tab',
            'sensitive' => false,
        ],
        'terminal_info' => [
            'label' => 'Terminal Information Ledger',
            'module' => 'screens',
            'kind' => 'tab',
            'sensitive' => false,
        ],
        'moniya' => [
            'label' => 'Moniya Container Terminal',
            'module' => 'screens',
            'kind' => 'tab',
            'sensitive' => false,
        ],
        'telemetry' => [
            'label' => 'Fleet Telemetry & Live GPS',
            'module' => 'screens',
            'kind' => 'tab',
            'sensitive' => false,
        ],
        'manifest' => [
            'label' => 'Cargo Manifests & Waybills',
            'module' => 'screens',
            'kind' => 'tab',
            'sensitive' => false,
        ],
        'billing' => [
            'label' => 'Invoices & Ledger',
            'module' => 'screens',
            'kind' => 'tab',
            'sensitive' => false,
        ],
        'users' => [
            'label' => 'User Directory',
            'module' => 'screens',
            'kind' => 'tab',
            'sensitive' => false,
        ],
        'permissions' => [
            'label' => 'Permissions Matrix',
            'module' => 'screens',
            'kind' => 'tab',
            'sensitive' => false,
        ],
        'account' => [
            'label' => 'Corporate Account Settings',
            'module' => 'screens',
            'kind' => 'tab',
            'sensitive' => false,
        ],
        'deals.view' => [
            'label' => 'View Deals',
            'module' => 'commercial',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'deals.create' => [
            'label' => 'Create Deals',
            'module' => 'commercial',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'deals.edit' => [
            'label' => 'Edit Deals',
            'module' => 'commercial',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'deals.approve' => [
            'label' => 'Approve Deals',
            'module' => 'commercial',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'deals.delete' => [
            'label' => 'Purge Deals',
            'module' => 'commercial',
            'kind' => 'action',
            'sensitive' => true,
        ],
        'deals.export' => [
            'label' => 'Export Deal Data',
            'module' => 'commercial',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'negotiation.view' => [
            'label' => 'View Discussions',
            'module' => 'negotiation',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'negotiation.message' => [
            'label' => 'Send Counter-Offers',
            'module' => 'negotiation',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'negotiation.lock' => [
            'label' => 'Lock Negotiation',
            'module' => 'negotiation',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'ops.manifest_view' => [
            'label' => 'View Manifests',
            'module' => 'operations',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'ops.dispatch' => [
            'label' => 'Dispatch Locomotives',
            'module' => 'operations',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'ops.loading_update' => [
            'label' => 'Update Loading',
            'module' => 'operations',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'ops.unloading_confirm' => [
            'label' => 'Confirm Yard Arrival',
            'module' => 'operations',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'ops.damage_audit' => [
            'label' => 'Audit Damages',
            'module' => 'operations',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'ops.gps_telemetry' => [
            'label' => 'Live GPS Telemetry',
            'module' => 'operations',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'fleet.view' => [
            'label' => 'View Fleet',
            'module' => 'fleet',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'fleet.assign' => [
            'label' => 'Assign Wagons',
            'module' => 'fleet',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'fleet.maintenance' => [
            'label' => 'Log Maintenance',
            'module' => 'fleet',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'fleet.register' => [
            'label' => 'Register Rolling Stock',
            'module' => 'fleet',
            'kind' => 'action',
            'sensitive' => true,
        ],
        'finance.coa_view' => [
            'label' => 'View Chart of Accounts',
            'module' => 'finance',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'finance.coa_manage' => [
            'label' => 'Manage Accounts',
            'module' => 'finance',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'finance.journal_create' => [
            'label' => 'Post Journal Entries',
            'module' => 'finance',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'finance.deal_costing' => [
            'label' => 'Set Freight Tariffs',
            'module' => 'finance',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'finance.invoices_issue' => [
            'label' => 'Issue Invoices',
            'module' => 'finance',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'finance.invoices_view_own' => [
            'label' => 'View Own Invoices',
            'module' => 'finance',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'finance.payments_record' => [
            'label' => 'Record Payments',
            'module' => 'finance',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'finance.requisitions_submit' => [
            'label' => 'Submit Requisitions',
            'module' => 'finance',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'finance.requisitions_approve' => [
            'label' => 'Approve Requisitions',
            'module' => 'finance',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'finance.requisitions_disburse' => [
            'label' => 'Disburse Funds',
            'module' => 'finance',
            'kind' => 'action',
            'sensitive' => true,
        ],
        'finance.statements_view' => [
            'label' => 'Financial Statements',
            'module' => 'finance',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'finance.bank_reconciliation' => [
            'label' => 'Bank Reconciliation',
            'module' => 'finance',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'users.view' => [
            'label' => 'View Directory',
            'module' => 'users',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'users.create' => [
            'label' => 'Provision Users',
            'module' => 'users',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'users.edit' => [
            'label' => 'Edit Profiles',
            'module' => 'users',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'users.reset_credentials' => [
            'label' => 'Reset Credentials',
            'module' => 'users',
            'kind' => 'action',
            'sensitive' => true,
        ],
        'users.deactivate' => [
            'label' => 'Deactivate Account',
            'module' => 'users',
            'kind' => 'action',
            'sensitive' => true,
        ],
        'users.delete' => [
            'label' => 'Delete Account Permanently',
            'module' => 'users',
            'kind' => 'action',
            'sensitive' => true,
        ],
        'system.permissions_edit' => [
            'label' => 'Edit Permissions Matrix',
            'module' => 'system',
            'kind' => 'action',
            'sensitive' => true,
        ],
        'system.audit_view' => [
            'label' => 'View Audit Log',
            'module' => 'system',
            'kind' => 'action',
            'sensitive' => false,
        ],
        'system.purge_data' => [
            'label' => 'Production Reset / Purge',
            'module' => 'system',
            'kind' => 'action',
            'sensitive' => true,
        ],
    ];

    /** Capability modules, for grouping in the permissions editor. */
    public const MODULES = [
        [
            'id' => 'screens',
            'name' => 'Screen & Tab Access',
            'description' => 'Which areas of the platform a role may open',
        ],
        [
            'id' => 'commercial',
            'name' => 'Commercial & Deals Desk',
            'description' => 'Contracts, spot rates, and customer agreements',
        ],
        [
            'id' => 'negotiation',
            'name' => 'Negotiation & Live Chat',
            'description' => 'Rate bargaining and client communication',
        ],
        [
            'id' => 'operations',
            'name' => 'Corridor Siding & Train Dispatch',
            'description' => 'Loading, dispatch, arrival, and damage audit',
        ],
        [
            'id' => 'fleet',
            'name' => 'Rolling Stock & Siding Fleet',
            'description' => 'Wagons and mainline locomotives',
        ],
        [
            'id' => 'finance',
            'name' => 'Accounting & Financial Suite',
            'description' => 'Ledger, invoices, requisitions, and statements',
        ],
        [
            'id' => 'users',
            'name' => 'Identity & Access Administration',
            'description' => 'Staff directory and credentials',
        ],
        [
            'id' => 'system',
            'name' => 'Security & System Governance',
            'description' => 'Permissions matrix, audit log, and data resets',
        ],
    ];

    /** Roles the platform recognises. */
    public const ROLES = [
        'ADMIN',
        'CEO',
        'MD',
        'HEAD_OF_OPERATIONS',
        'HEAD_OF_FINANCE',
        'ACCOUNTANT',
        'CARGO_OFFICER',
        'CUSTOMER',
        'CONSIGNEE',
    ];

    /** Human-readable role names. */
    public const ROLE_LABELS = [
        'ADMIN' => 'Administrator',
        'CEO' => 'Managing Director / CEO',
        'MD' => 'Managing Director',
        'HEAD_OF_OPERATIONS' => 'Head of Operations',
        'HEAD_OF_FINANCE' => 'Head of Finance / Treasurer',
        'ACCOUNTANT' => 'Accountant',
        'CARGO_OFFICER' => 'Cargo Officer',
        'CUSTOMER' => 'Industrial Consignee',
        'CONSIGNEE' => 'Industrial Consignee',
    ];

    /** Roles belonging to external clients rather than Bueno staff. */
    public const EXTERNAL_ROLES = [
        'CUSTOMER',
        'CONSIGNEE',
    ];

    /**
     * Capabilities that are destructive or grant privilege escalation.
     * These may never be held by an external role.
     */
    public const SENSITIVE = [
        'deals.delete',
        'fleet.register',
        'finance.requisitions_disburse',
        'users.reset_credentials',
        'users.deactivate',
        'users.delete',
        'system.permissions_edit',
        'system.purge_data',
    ];

    /** Portal-local tab ids that map onto a shared capability. */
    public const TAB_ALIASES = [
        'loading' => 'deals',
        'trips' => 'deals',
        'in_transit' => 'deals',
        'incoming_unload' => 'deals',
        'unloading' => 'deals',
        'dispatch' => 'deals',
        'funds' => 'fund_requisitions',
        'requisitions' => 'fund_requisitions',
        'wagons' => 'fleet',
        'history' => 'manifest',
    ];

    /** Default capability grant per role. */
    public const DEFAULTS = [
        'ADMIN' => [
            'analytics',
            'deals',
            'negotiations',
            'fund_requisitions',
            'fleet',
            'terminal_info',
            'moniya',
            'telemetry',
            'manifest',
            'billing',
            'users',
            'permissions',
            'account',
            'deals.view',
            'deals.create',
            'deals.edit',
            'deals.approve',
            'deals.delete',
            'deals.export',
            'negotiation.view',
            'negotiation.message',
            'negotiation.lock',
            'ops.manifest_view',
            'ops.dispatch',
            'ops.loading_update',
            'ops.unloading_confirm',
            'ops.damage_audit',
            'ops.gps_telemetry',
            'fleet.view',
            'fleet.assign',
            'fleet.maintenance',
            'fleet.register',
            'finance.coa_view',
            'finance.coa_manage',
            'finance.journal_create',
            'finance.deal_costing',
            'finance.invoices_issue',
            'finance.invoices_view_own',
            'finance.payments_record',
            'finance.requisitions_submit',
            'finance.requisitions_approve',
            'finance.requisitions_disburse',
            'finance.statements_view',
            'finance.bank_reconciliation',
            'users.view',
            'users.create',
            'users.edit',
            'users.reset_credentials',
            'users.deactivate',
            'users.delete',
            'system.permissions_edit',
            'system.audit_view',
            'system.purge_data',
        ],
        'CEO' => [
            'analytics',
            'deals',
            'negotiations',
            'fund_requisitions',
            'fleet',
            'terminal_info',
            'moniya',
            'telemetry',
            'manifest',
            'billing',
            'users',
            'permissions',
            'account',
            'deals.view',
            'deals.create',
            'deals.edit',
            'deals.approve',
            'deals.delete',
            'deals.export',
            'negotiation.view',
            'negotiation.message',
            'negotiation.lock',
            'ops.manifest_view',
            'ops.dispatch',
            'ops.loading_update',
            'ops.unloading_confirm',
            'ops.damage_audit',
            'ops.gps_telemetry',
            'fleet.view',
            'fleet.assign',
            'fleet.maintenance',
            'fleet.register',
            'finance.coa_view',
            'finance.coa_manage',
            'finance.journal_create',
            'finance.deal_costing',
            'finance.invoices_issue',
            'finance.invoices_view_own',
            'finance.payments_record',
            'finance.requisitions_submit',
            'finance.requisitions_approve',
            'finance.requisitions_disburse',
            'finance.statements_view',
            'finance.bank_reconciliation',
            'users.view',
            'users.create',
            'users.edit',
            'users.reset_credentials',
            'users.deactivate',
            'users.delete',
            'system.permissions_edit',
            'system.audit_view',
        ],
        'MD' => [
            'analytics',
            'deals',
            'negotiations',
            'fund_requisitions',
            'fleet',
            'terminal_info',
            'moniya',
            'telemetry',
            'manifest',
            'billing',
            'users',
            'permissions',
            'account',
            'deals.view',
            'deals.create',
            'deals.edit',
            'deals.approve',
            'deals.delete',
            'deals.export',
            'negotiation.view',
            'negotiation.message',
            'negotiation.lock',
            'ops.manifest_view',
            'ops.dispatch',
            'ops.loading_update',
            'ops.unloading_confirm',
            'ops.damage_audit',
            'ops.gps_telemetry',
            'fleet.view',
            'fleet.assign',
            'fleet.maintenance',
            'fleet.register',
            'finance.coa_view',
            'finance.coa_manage',
            'finance.journal_create',
            'finance.deal_costing',
            'finance.invoices_issue',
            'finance.invoices_view_own',
            'finance.payments_record',
            'finance.requisitions_submit',
            'finance.requisitions_approve',
            'finance.requisitions_disburse',
            'finance.statements_view',
            'finance.bank_reconciliation',
            'users.view',
            'users.create',
            'users.edit',
            'users.reset_credentials',
            'users.deactivate',
            'users.delete',
            'system.permissions_edit',
            'system.audit_view',
        ],
        'HEAD_OF_OPERATIONS' => [
            'analytics',
            'deals',
            'negotiations',
            'fund_requisitions',
            'fleet',
            'terminal_info',
            'moniya',
            'telemetry',
            'manifest',
            'account',
            'deals.view',
            'deals.edit',
            'deals.approve',
            'deals.export',
            'negotiation.view',
            'negotiation.message',
            'negotiation.lock',
            'ops.manifest_view',
            'ops.dispatch',
            'ops.loading_update',
            'ops.unloading_confirm',
            'ops.damage_audit',
            'ops.gps_telemetry',
            'fleet.view',
            'fleet.assign',
            'fleet.maintenance',
            'fleet.register',
            'finance.requisitions_submit',
            'finance.requisitions_approve',
            'users.view',
            'system.audit_view',
        ],
        'HEAD_OF_FINANCE' => [
            'analytics',
            'deals',
            'negotiations',
            'fund_requisitions',
            'billing',
            'manifest',
            'account',
            'deals.view',
            'deals.export',
            'negotiation.view',
            'ops.manifest_view',
            'ops.damage_audit',
            'finance.coa_view',
            'finance.coa_manage',
            'finance.journal_create',
            'finance.deal_costing',
            'finance.invoices_issue',
            'finance.payments_record',
            'finance.requisitions_approve',
            'finance.requisitions_disburse',
            'finance.statements_view',
            'finance.bank_reconciliation',
            'users.view',
            'system.audit_view',
        ],
        'ACCOUNTANT' => [
            'analytics',
            'deals',
            'negotiations',
            'fund_requisitions',
            'billing',
            'manifest',
            'account',
            'deals.view',
            'deals.export',
            'negotiation.view',
            'ops.manifest_view',
            'ops.damage_audit',
            'finance.coa_view',
            'finance.journal_create',
            'finance.deal_costing',
            'finance.invoices_issue',
            'finance.payments_record',
            'finance.requisitions_approve',
            'finance.statements_view',
            'finance.bank_reconciliation',
            'users.view',
            'system.audit_view',
        ],
        'CARGO_OFFICER' => [
            'deals',
            'fleet',
            'terminal_info',
            'moniya',
            'telemetry',
            'manifest',
            'fund_requisitions',
            'account',
            'deals.view',
            'ops.manifest_view',
            'ops.loading_update',
            'ops.unloading_confirm',
            'ops.damage_audit',
            'ops.gps_telemetry',
            'fleet.view',
            'fleet.assign',
            'fleet.maintenance',
            'finance.requisitions_submit',
        ],
        'CUSTOMER' => [
            'negotiations',
            'telemetry',
            'manifest',
            'billing',
            'account',
            'deals.view',
            'negotiation.view',
            'negotiation.message',
            'ops.manifest_view',
            'ops.gps_telemetry',
            'finance.invoices_view_own',
        ],
        'CONSIGNEE' => [
            'negotiations',
            'telemetry',
            'manifest',
            'billing',
            'account',
            'deals.view',
            'negotiation.view',
            'negotiation.message',
            'ops.manifest_view',
            'ops.gps_telemetry',
            'finance.invoices_view_own',
        ],
    ];

    public static function exists(string $key): bool
    {
        return in_array($key, self::ALL, true);
    }

    public static function isSensitive(string $key): bool
    {
        return in_array($key, self::SENSITIVE, true);
    }

    public static function isExternalRole(string $role): bool
    {
        return in_array($role, self::EXTERNAL_ROLES, true);
    }

    public static function resolveTab(string $tabId): string
    {
        return self::TAB_ALIASES[$tabId] ?? $tabId;
    }

    /** @return string[] */
    public static function defaultsFor(string $role): array
    {
        return self::DEFAULTS[$role] ?? [];
    }

    /**
     * Merge a stored matrix over the defaults, dropping unknown keys and
     * stripping sensitive capabilities from external roles. Mirrors
     * normalizeMatrix() in the TypeScript registry.
     *
     * @param  mixed $stored
     * @return array<string,string[]>
     */
    public static function normalizeMatrix($stored): array
    {
        $out    = [];
        $source = is_array($stored) ? $stored : [];

        foreach (self::ROLES as $role) {
            $raw = $source[$role] ?? null;
            if (is_array($raw)) {
                $clean = [];
                foreach ($raw as $key) {
                    if (is_string($key) && self::exists($key) && !in_array($key, $clean, true)) {
                        $clean[] = $key;
                    }
                }
                $out[$role] = $clean;
            } else {
                $out[$role] = self::defaultsFor($role);
            }
        }

        foreach (self::EXTERNAL_ROLES as $role) {
            $out[$role] = array_values(array_filter(
                $out[$role],
                static fn($k) => !self::isSensitive($k)
            ));
        }

        return $out;
    }
}
