/**
 * Sandbox Environment Service
 * Manages sandbox data, API key isolation, and test environment setup
 */

import { BaseService } from './baseService';
import { SandboxInfo, SampleApiRequest, ApiKey } from '@/types/api';
import { logger } from './loggingService';

interface SandboxCompany {
  id: string;
  name: string;
  jurisdiction: string;
  authorized_shares: number;
  stakeholder_count: number;
  total_securities: number;
  created_at: string;
}

interface SandboxStakeholder {
  id: string;
  company_id: string;
  name: string;
  type: 'EMPLOYEE' | 'FOUNDER' | 'INVESTOR' | 'ADVISOR';
  email: string;
  total_shares: number;
  ownership_percentage: number;
}

interface SandboxSecurity {
  id: string;
  company_id: string;
  stakeholder_id: string;
  type: 'COMMON_STOCK' | 'STOCK_OPTION' | 'PREFERRED_STOCK';
  quantity: number;
  strike_price?: number;
  status: 'GRANTED' | 'VESTING' | 'VESTED' | 'EXERCISED';
  grant_date: string;
}

class SandboxService extends BaseService {
  private readonly SANDBOX_COMPANY_PREFIX = 'sandbox_';
  private readonly SANDBOX_DATA_RESET_SCHEDULE = 'Every Sunday at 00:00 UTC';

  /**
   * Get sandbox environment information
   */
  getSandboxInfo(): SandboxInfo {
    return {
      environment: 'sandbox',
      base_url: process.env.API_BASE_URL || 'http://localhost:3000/api/v1',
      test_data_available: true,
      reset_schedule: this.SANDBOX_DATA_RESET_SCHEDULE,
      limitations: [
        'Rate limits are reduced by 50% compared to production',
        'Webhook deliveries have a 10-second timeout limit',
        'Test data is reset weekly',
        'Maximum 5 API keys per sandbox company',
        'File uploads limited to 5MB',
        'Sandbox data cannot be migrated to production'
      ],
      sample_requests: this.getSampleRequests()
    };
  }

  /**
   * Initialize sandbox environment for a company
   */
  async initializeSandboxEnvironment(companyId: string): Promise<void> {
    return this.withTransaction(async (client) => {
      // Check if already initialized
      const existingData = await client.query(
        'SELECT COUNT(*) as count FROM people WHERE company_id = $1 AND name LIKE $2',
        [companyId, 'Sandbox%']
      );

      if (parseInt(existingData.rows[0].count) > 0) {
        logger.debug('Sandbox environment already initialized', { companyId });
        return;
      }

      logger.info('Initializing sandbox environment', { companyId });

      // Create sample stakeholders
      const sampleStakeholders = await this.createSampleStakeholders(client, companyId);

      // Create sample securities
      await this.createSampleSecurities(client, companyId, sampleStakeholders);

      // Create sample transactions
      await this.createSampleTransactions(client, companyId, sampleStakeholders);

      // Create sample valuation
      await this.createSampleValuation(client, companyId);

      logger.info('Sandbox environment initialized successfully', { companyId });
    });
  }

  /**
   * Reset sandbox data for a company
   */
  async resetSandboxData(companyId: string): Promise<void> {
    return this.withTransaction(async (client) => {
      // Delete existing sandbox data (in reverse order of dependencies)
      await client.query(
        'DELETE FROM transactions WHERE company_id = $1 AND created_at >= NOW() - INTERVAL \'90 days\'',
        [companyId]
      );

      await client.query(
        'DELETE FROM vesting_schedules WHERE security_id IN (SELECT id FROM securities WHERE company_id = $1)',
        [companyId]
      );

      await client.query(
        'DELETE FROM securities WHERE company_id = $1',
        [companyId]
      );

      await client.query(
        'DELETE FROM people WHERE company_id = $1 AND name LIKE $2',
        [companyId, 'Sandbox%']
      );

      await client.query(
        'DELETE FROM fair_market_valuations WHERE company_id = $1 AND notes LIKE $2',
        [companyId, 'Sandbox%']
      );

      // Reinitialize with fresh data
      await this.initializeSandboxEnvironment(companyId);
    });
  }

  /**
   * Get sandbox statistics for a company
   */
  async getSandboxStats(companyId: string) {
    const result = await this.executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM people WHERE company_id = $1 AND name LIKE 'Sandbox%') as stakeholders,
        (SELECT COUNT(*) FROM securities WHERE company_id = $1) as securities,
        (SELECT COUNT(*) FROM transactions WHERE company_id = $1) as transactions,
        (SELECT COUNT(*) FROM api_keys WHERE company_id = $1 AND environment = 'sandbox') as api_keys,
        (SELECT COUNT(*) FROM webhook_endpoints WHERE company_id = $1) as webhooks
    `, [companyId]);

    const stats = result.rows[0];

    return {
      stakeholders: parseInt(stats.stakeholders) || 0,
      securities: parseInt(stats.securities) || 0,
      transactions: parseInt(stats.transactions) || 0,
      api_keys: parseInt(stats.api_keys) || 0,
      webhooks: parseInt(stats.webhooks) || 0,
      last_reset: await this.getLastResetTime(companyId),
      next_reset: this.getNextResetTime()
    };
  }

  /**
   * Create sample API key for testing
   */
  async createSampleApiKey(companyId: string, keyName: string = 'Sandbox Test Key') {
    const { apiKeyService } = await import('./apiKeyService');
    
    return apiKeyService.createApiKey(companyId, {
      name: keyName,
      description: 'Sample API key for testing sandbox environment',
      environment: 'sandbox',
      scopes: [
        'companies:read',
        'stakeholders:read', 
        'stakeholders:write',
        'securities:read',
        'securities:write',
        'transactions:read',
        'transactions:write',
        'reports:read',
        'webhooks:manage'
      ],
      rate_limit_tier: 'standard'
    });
  }

  /**
   * Validate sandbox API key usage
   */
  async validateSandboxUsage(apiKeyId: string): Promise<boolean> {
    const result = await this.executeQuery(
      'SELECT environment FROM api_keys WHERE id = $1',
      [apiKeyId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].environment === 'sandbox';
  }

  /**
   * Get sample companies for sandbox testing
   */
  async getSampleCompanies(): Promise<SandboxCompany[]> {
    const sampleCompanies: SandboxCompany[] = [
      {
        id: 'sandbox-company-1',
        name: 'TechStart Inc.',
        jurisdiction: 'Delaware',
        authorized_shares: 10000000,
        stakeholder_count: 8,
        total_securities: 5,
        created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'sandbox-company-2',
        name: 'InnovateCorp',
        jurisdiction: 'California',
        authorized_shares: 5000000,
        stakeholder_count: 12,
        total_securities: 7,
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'sandbox-company-3',
        name: 'GrowthVentures Ltd.',
        jurisdiction: 'UK',
        authorized_shares: 1000000,
        stakeholder_count: 6,
        total_securities: 4,
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    return sampleCompanies;
  }

  /**
   * Create sample stakeholders for testing
   */
  private async createSampleStakeholders(client: any, companyId: string): Promise<string[]> {
    const sampleStakeholders = [
      { name: 'Sandbox Founder - John Smith', type: 'FOUNDER', email: 'john.smith@sandbox.test' },
      { name: 'Sandbox Founder - Jane Doe', type: 'FOUNDER', email: 'jane.doe@sandbox.test' },
      { name: 'Sandbox Employee - Alice Johnson', type: 'EMPLOYEE', email: 'alice.johnson@sandbox.test' },
      { name: 'Sandbox Employee - Bob Wilson', type: 'EMPLOYEE', email: 'bob.wilson@sandbox.test' },
      { name: 'Sandbox Investor - Venture Capital Fund', type: 'INVESTOR', email: 'contact@vcfund.sandbox.test' },
      { name: 'Sandbox Advisor - Mary Chen', type: 'ADVISOR', email: 'mary.chen@sandbox.test' }
    ];

    const createdIds: string[] = [];

    for (const stakeholder of sampleStakeholders) {
      const result = await client.query(`
        INSERT INTO people (
          company_id, name, type, email, 
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id
      `, [companyId, stakeholder.name, stakeholder.type, stakeholder.email]);

      createdIds.push(result.rows[0].id);
    }

    return createdIds;
  }

  /**
   * Create sample securities
   */
  private async createSampleSecurities(client: any, companyId: string, stakeholderIds: string[]): Promise<void> {
    const securities = [
      // Founder common stock
      {
        stakeholder_id: stakeholderIds[0],
        type: 'COMMON_STOCK',
        quantity: 4000000,
        status: 'ISSUED',
        grant_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      },
      {
        stakeholder_id: stakeholderIds[1],
        type: 'COMMON_STOCK',
        quantity: 3000000,
        status: 'ISSUED',
        grant_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      },
      // Employee stock options
      {
        stakeholder_id: stakeholderIds[2],
        type: 'STOCK_OPTION',
        quantity: 50000,
        strike_price: 0.50,
        status: 'VESTING',
        grant_date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
      },
      {
        stakeholder_id: stakeholderIds[3],
        type: 'STOCK_OPTION',
        quantity: 30000,
        strike_price: 0.50,
        status: 'GRANTED',
        grant_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      },
      // Investor preferred stock
      {
        stakeholder_id: stakeholderIds[4],
        type: 'PREFERRED_STOCK',
        quantity: 1000000,
        strike_price: 2.00,
        status: 'ISSUED',
        grant_date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)
      },
      // Advisor options
      {
        stakeholder_id: stakeholderIds[5],
        type: 'STOCK_OPTION',
        quantity: 10000,
        strike_price: 0.50,
        status: 'VESTED',
        grant_date: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000)
      }
    ];

    for (const security of securities) {
      await client.query(`
        INSERT INTO securities (
          company_id, stakeholder_id, type, quantity, 
          strike_price, status, grant_date, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        companyId,
        security.stakeholder_id,
        security.type,
        security.quantity,
        security.strike_price,
        security.status,
        security.grant_date
      ]);
    }
  }

  /**
   * Create sample transactions
   */
  private async createSampleTransactions(client: any, companyId: string, stakeholderIds: string[]): Promise<void> {
    const transactions = [
      {
        type: 'ISSUANCE',
        stakeholder_id: stakeholderIds[0],
        quantity: 4000000,
        price_per_share: 0.001,
        date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      },
      {
        type: 'ISSUANCE',
        stakeholder_id: stakeholderIds[1],
        quantity: 3000000,
        price_per_share: 0.001,
        date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      },
      {
        type: 'ISSUANCE',
        stakeholder_id: stakeholderIds[4],
        quantity: 1000000,
        price_per_share: 2.00,
        date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)
      }
    ];

    for (const transaction of transactions) {
      await client.query(`
        INSERT INTO transactions (
          company_id, type, stakeholder_id, quantity,
          price_per_share, total_amount, date, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        companyId,
        transaction.type,
        transaction.stakeholder_id,
        transaction.quantity,
        transaction.price_per_share,
        transaction.quantity * transaction.price_per_share,
        transaction.date
      ]);
    }
  }

  /**
   * Create sample valuation
   */
  private async createSampleValuation(client: any, companyId: string): Promise<void> {
    await client.query(`
      INSERT INTO fair_market_valuations (
        company_id, valuation_date, fair_market_value_per_share,
        total_company_value, methodology, status, notes, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW()
      )
    `, [
      companyId,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      2.50,
      20000000,
      'DCF Analysis',
      'APPROVED',
      'Sandbox 409A valuation for testing purposes'
    ]);
  }

  /**
   * Get sample API requests for documentation
   */
  private getSampleRequests(): SampleApiRequest[] {
    return [
      {
        name: 'List Companies',
        description: 'Get a list of all companies accessible to your API key',
        method: 'GET',
        endpoint: '/companies',
        headers: {
          'Authorization': 'Bearer ak_test_your_api_key_here',
          'Content-Type': 'application/json'
        },
        expected_response: {
          data: [
            {
              id: 'sandbox-company-1',
              name: 'TechStart Inc.',
              jurisdiction: 'Delaware',
              authorized_shares: 10000000,
              outstanding_shares: 8050000,
              created_at: '2024-01-01T00:00:00.000Z'
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            pages: 1
          }
        }
      },
      {
        name: 'Get Cap Table',
        description: 'Retrieve the complete cap table for a company',
        method: 'GET',
        endpoint: '/companies/{companyId}/cap-table',
        headers: {
          'Authorization': 'Bearer ak_test_your_api_key_here',
          'Content-Type': 'application/json'
        },
        expected_response: {
          company_id: 'sandbox-company-1',
          as_of_date: '2024-12-31',
          summary: {
            total_authorized_shares: 10000000,
            total_outstanding_shares: 8050000,
            total_options_granted: 90000,
            fully_diluted_shares: 8140000,
            post_money_valuation: 20000000
          },
          holdings: [
            {
              stakeholder_id: 'stakeholder-1',
              security_id: 'security-1',
              share_class: 'Common',
              quantity: 4000000,
              ownership_percentage: 0.4918
            }
          ]
        }
      },
      {
        name: 'Create Stakeholder',
        description: 'Add a new stakeholder to the cap table',
        method: 'POST',
        endpoint: '/companies/{companyId}/stakeholders',
        headers: {
          'Authorization': 'Bearer ak_test_your_api_key_here',
          'Content-Type': 'application/json'
        },
        body: {
          name: 'John Doe',
          type: 'EMPLOYEE',
          email: 'john.doe@example.com',
          accredited_investor: false
        },
        expected_response: {
          id: 'new-stakeholder-id',
          name: 'John Doe',
          type: 'EMPLOYEE',
          email: 'john.doe@example.com',
          accredited_investor: false,
          total_shares: 0,
          ownership_percentage: 0,
          created_at: '2024-12-31T12:00:00.000Z'
        }
      },
      {
        name: 'Issue Stock Options',
        description: 'Issue stock options to a stakeholder',
        method: 'POST',
        endpoint: '/companies/{companyId}/securities',
        headers: {
          'Authorization': 'Bearer ak_test_your_api_key_here',
          'Content-Type': 'application/json'
        },
        body: {
          type: 'STOCK_OPTION',
          stakeholder_id: 'stakeholder-id',
          quantity: 10000,
          strike_price: 2.50,
          vesting_schedule: {
            type: 'TIME_BASED',
            cliff_months: 12,
            vesting_months: 48,
            start_date: '2024-01-01'
          }
        },
        expected_response: {
          id: 'new-security-id',
          type: 'STOCK_OPTION',
          stakeholder_id: 'stakeholder-id',
          quantity: 10000,
          strike_price: 2.50,
          status: 'GRANTED',
          created_at: '2024-12-31T12:00:00.000Z'
        }
      },
      {
        name: 'Create Webhook',
        description: 'Set up a webhook to receive real-time updates',
        method: 'POST',
        endpoint: '/webhooks',
        headers: {
          'Authorization': 'Bearer ak_test_your_api_key_here',
          'Content-Type': 'application/json'
        },
        body: {
          name: 'Test Webhook',
          url: 'https://your-app.com/webhooks/captable',
          events: ['stakeholder.created', 'security.issued', 'transaction.created'],
          secret: 'your-webhook-secret-key'
        },
        expected_response: {
          id: 'webhook-id',
          name: 'Test Webhook',
          url: 'https://your-app.com/webhooks/captable',
          events: ['stakeholder.created', 'security.issued', 'transaction.created'],
          active: true,
          created_at: '2024-12-31T12:00:00.000Z'
        }
      }
    ];
  }

  /**
   * Get last reset time for sandbox data
   */
  private async getLastResetTime(companyId: string): Promise<string | null> {
    const result = await this.executeQuery(`
      SELECT MAX(created_at) as last_reset
      FROM people 
      WHERE company_id = $1 AND name LIKE 'Sandbox%'
    `, [companyId]);

    return result.rows[0]?.last_reset?.toISOString() || null;
  }

  /**
   * Calculate next reset time
   */
  private getNextResetTime(): string {
    const now = new Date();
    const nextSunday = new Date();
    nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
    nextSunday.setHours(0, 0, 0, 0);
    
    // If it's already Sunday and before midnight, reset is today
    if (now.getDay() === 0 && nextSunday <= now) {
      nextSunday.setDate(nextSunday.getDate() + 7);
    }
    
    return nextSunday.toISOString();
  }

  /**
   * Clean up expired sandbox data (called by scheduled job)
   */
  async cleanupExpiredSandboxData(): Promise<number> {
    const result = await this.executeQuery(`
      WITH deleted_companies AS (
        DELETE FROM companies 
        WHERE name LIKE $1 
          AND created_at < NOW() - INTERVAL '30 days'
        RETURNING id
      )
      SELECT COUNT(*) as deleted_count FROM deleted_companies
    `, [`${this.SANDBOX_COMPANY_PREFIX}%`]);

    const deletedCount = parseInt(result.rows[0]?.deleted_count || '0');
    
    if (deletedCount > 0) {
      logger.info('Cleaned up expired sandbox companies', { deletedCount });
    }

    return deletedCount;
  }

  /**
   * Generate test data for specific scenarios
   */
  async generateScenarioData(companyId: string, scenario: 'startup' | 'growth' | 'series_a' | 'ipo_prep'): Promise<void> {
    return this.withTransaction(async (client) => {
      // Clear existing sandbox data first
      await this.resetSandboxData(companyId);

      switch (scenario) {
        case 'startup':
          await this.generateStartupScenario(client, companyId);
          break;
        case 'growth':
          await this.generateGrowthScenario(client, companyId);
          break;
        case 'series_a':
          await this.generateSeriesAScenario(client, companyId);
          break;
        case 'ipo_prep':
          await this.generateIPOPrepScenario(client, companyId);
          break;
        default:
          await this.initializeSandboxEnvironment(companyId);
      }
    });
  }

  private async generateStartupScenario(client: any, companyId: string): Promise<void> {
    // Early stage startup with 2 founders and small option pool
    const founders = [
      { name: 'Sandbox Founder - CEO', type: 'FOUNDER', email: 'ceo@startup.sandbox.test', shares: 6000000 },
      { name: 'Sandbox Founder - CTO', type: 'FOUNDER', email: 'cto@startup.sandbox.test', shares: 4000000 }
    ];

    for (const founder of founders) {
      const stakeholderResult = await client.query(`
        INSERT INTO people (company_id, name, type, email, created_at)
        VALUES ($1, $2, $3, $4, NOW()) RETURNING id
      `, [companyId, founder.name, founder.type, founder.email]);

      await client.query(`
        INSERT INTO securities (company_id, stakeholder_id, type, quantity, status, grant_date, created_at)
        VALUES ($1, $2, 'COMMON_STOCK', $3, 'ISSUED', NOW() - INTERVAL '1 year', NOW())
      `, [companyId, stakeholderResult.rows[0].id, founder.shares]);
    }
  }

  private async generateGrowthScenario(client: any, companyId: string): Promise<void> {
    // Growing startup with employees, advisors, and seed funding
    await this.initializeSandboxEnvironment(companyId);
    // Additional growth-stage specific data would be added here
  }

  private async generateSeriesAScenario(client: any, companyId: string): Promise<void> {
    // Series A company with VC funding and expanded team
    await this.initializeSandboxEnvironment(companyId);
    // Additional Series A specific data would be added here
  }

  private async generateIPOPrepScenario(client: any, companyId: string): Promise<void> {
    // Pre-IPO company with complex cap table
    await this.initializeSandboxEnvironment(companyId);
    // Additional IPO prep specific data would be added here
  }
}

export const sandboxService = new SandboxService();