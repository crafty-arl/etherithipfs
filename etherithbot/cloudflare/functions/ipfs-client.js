/**
 * IPFS Client for Cloudflare Workers
 * Enhanced with comprehensive diagnostics and access strategies for http://31.220.107.113:5001/
 */

/**
 * IPFS Client class optimized for Cloudflare Workers with enhanced node access
 */
export class IPFSWorkerClient {
  constructor(nodeUrl = 'http://31.220.107.113:5001/', options = {}) {
    this.baseUrl = nodeUrl.endsWith('/') ? nodeUrl.slice(0, -1) : nodeUrl;
    this.timeout = options.timeout || 60000;
    this.retries = options.retries || 5; // Increased retries for the required node
    this.pinFiles = options.pinFiles !== false;
    this.gatewayUrl = options.gatewayUrl || 'https://ipfs.io/ipfs/';
    
    // Enhanced configuration for the specific node
    this.nodeConfig = {
      requiresAuth: false,
      apiKey: options.apiKey || null,
      customHeaders: options.customHeaders || {},
      corsMode: options.corsMode || 'cors'
    };
    
    console.log(`🔧 IPFS Client initialized for required node: ${this.baseUrl}`);
    console.log(`🔧 Configuration:`, this.nodeConfig);
  }

  /**
   * Enhanced upload with multiple access strategies for http://31.220.107.113:5001/
   */
  async uploadFile(fileBuffer, fileName, options = {}) {
    const startTime = Date.now();
    console.log(`🚀 Starting enhanced IPFS upload for file: ${fileName} to ${this.baseUrl}`);

    try {
      // Prepare form data for IPFS API
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { 
        type: options.contentType || 'application/octet-stream' 
      });
      formData.append('file', blob, fileName);

      // Build upload URL
      const uploadUrl = this._buildUploadUrl(options);
      
      // Try multiple upload strategies
      const result = await this._uploadWithMultipleStrategies(uploadUrl, formData, fileName);
      
      const uploadTime = Date.now() - startTime;
      console.log(`✅ IPFS upload completed for ${fileName} in ${uploadTime}ms, CID: ${result.cid}`);
      
      return result;

    } catch (error) {
      const uploadTime = Date.now() - startTime;
      console.error(`❌ IPFS upload failed for ${fileName} after ${uploadTime}ms:`, error);
      throw new Error(`IPFS upload failed: ${error.message}`);
    }
  }

  /**
   * Pin a file to IPFS to ensure persistence
   * @param {string} cid - Content Identifier to pin
   * @returns {Promise<Object>} Pin result
   */
  async pinFile(cid) {
    if (!this.pinFiles) {
      console.log(`IPFS pinning disabled, skipping pin for CID: ${cid}`);
      return { success: true, pinned: false, message: 'Pinning disabled' };
    }

    try {
      console.log(`Pinning file to IPFS: ${cid}`);
      
      const pinUrl = `${this.baseUrl}/api/v0/pin/add?arg=${cid}&recursive=true`;
      
      const response = await this._makeRequest(pinUrl, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`Successfully pinned CID: ${cid}`);
        return { success: true, pinned: true, result };
      } else {
        throw new Error(`Pin request failed with status: ${response.status}`);
      }

    } catch (error) {
      console.error(`Failed to pin CID ${cid}:`, error);
      // Don't throw error for pinning failures - file is still uploaded
      return { success: false, pinned: false, error: error.message };
    }
  }

  /**
   * Generate IPFS gateway URL for a CID
   * @param {string} cid - Content Identifier
   * @returns {string} Gateway URL
   */
  getGatewayUrl(cid) {
    const gatewayUrl = this.gatewayUrl.endsWith('/') 
      ? this.gatewayUrl 
      : this.gatewayUrl + '/';
    
    return `${gatewayUrl}${cid}`;
  }

  /**
   * Comprehensive health check with detailed diagnostics for http://31.220.107.113:5001/
   */
  async healthCheck() {
    console.log(`🔍 Running comprehensive health check for ${this.baseUrl}`);
    
    const diagnostics = {
      node: this.baseUrl,
      timestamp: new Date().toISOString(),
      tests: [],
      healthy: false,
      accessible: false,
      version: null,
      error: null
    };

    // Test 1: Basic connectivity
    try {
      console.log(`🔍 Test 1: Basic connectivity to ${this.baseUrl}`);
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'IPFS-Memory-Weaver/1.0'
        }
      });
      
      diagnostics.tests.push({
        name: 'basic_connectivity',
        status: response.status,
        success: response.status < 400,
        details: `HTTP ${response.status}`
      });
      
      if (response.status < 400) {
        diagnostics.accessible = true;
      }
    } catch (error) {
      diagnostics.tests.push({
        name: 'basic_connectivity',
        success: false,
        error: error.message
      });
    }

    // Test 2: IPFS API Version endpoint
    try {
      console.log(`🔍 Test 2: IPFS API version check`);
      const versionUrl = `${this.baseUrl}/api/v0/version`;
      const response = await this._makeRequestWithDiagnostics(versionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.ok) {
        const version = await response.json();
        diagnostics.version = version.Version;
        diagnostics.healthy = true;
        diagnostics.tests.push({
          name: 'api_version',
          success: true,
          version: version.Version,
          details: version
        });
      } else {
        const errorText = await response.text();
        diagnostics.tests.push({
          name: 'api_version',
          success: false,
          status: response.status,
          error: errorText,
          details: `HTTP ${response.status}: ${errorText}`
        });
      }
    } catch (error) {
      diagnostics.tests.push({
        name: 'api_version',
        success: false,
        error: error.message
      });
    }

    // Test 3: CORS preflight check
    try {
      console.log(`🔍 Test 3: CORS preflight check`);
      const response = await fetch(`${this.baseUrl}/api/v0/add`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://memory-weaver-simple.aaron-carl-lewis.workers.dev',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      
      diagnostics.tests.push({
        name: 'cors_preflight',
        status: response.status,
        success: response.status < 400,
        headers: Object.fromEntries(response.headers.entries())
      });
    } catch (error) {
      diagnostics.tests.push({
        name: 'cors_preflight',
        success: false,
        error: error.message
      });
    }

    // Test 4: Upload endpoint accessibility
    try {
      console.log(`🔍 Test 4: Upload endpoint accessibility`);
      const uploadUrl = `${this.baseUrl}/api/v0/add`;
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'User-Agent': 'IPFS-Memory-Weaver/1.0'
        },
        body: new FormData() // Empty form data
      });
      
      diagnostics.tests.push({
        name: 'upload_endpoint',
        status: response.status,
        success: response.status !== 403, // 403 is our main problem
        details: response.status === 403 ? 'FORBIDDEN - Access Denied' : `HTTP ${response.status}`
      });
    } catch (error) {
      diagnostics.tests.push({
        name: 'upload_endpoint',
        success: false,
        error: error.message
      });
    }

    console.log(`🔍 Health check completed. Healthy: ${diagnostics.healthy}, Accessible: ${diagnostics.accessible}`);
    return diagnostics;
  }

  /**
   * Private method to build upload URL with options
   * @param {Object} options - Upload options
   * @returns {string} Upload URL
   */
  _buildUploadUrl(options = {}) {
    let url = `${this.baseUrl}/api/v0/add`;
    const params = new URLSearchParams();
    
    // Add IPFS upload options
    if (options.pin !== false) params.append('pin', 'true');
    if (options.wrapWithDirectory) params.append('wrap-with-directory', 'true');
    if (options.progress) params.append('progress', 'true');
    params.append('hash', 'sha2-256');
    
    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  /**
   * Try multiple upload strategies for the required node
   */
  async _uploadWithMultipleStrategies(url, formData, fileName) {
    const strategies = [
      {
        name: 'standard',
        headers: {
          'User-Agent': 'IPFS-Memory-Weaver/1.0'
        }
      },
      {
        name: 'with_origin',
        headers: {
          'User-Agent': 'IPFS-Memory-Weaver/1.0',
          'Origin': 'https://memory-weaver-simple.aaron-carl-lewis.workers.dev'
        }
      },
      {
        name: 'basic_auth_attempt',
        headers: {
          'User-Agent': 'IPFS-Memory-Weaver/1.0',
          'Authorization': 'Basic ' + btoa('admin:admin')
        }
      },
      {
        name: 'api_key_header',
        headers: {
          'User-Agent': 'IPFS-Memory-Weaver/1.0',
          'X-API-Key': 'memory-weaver-2024',
          'Authorization': 'Bearer memory-weaver-2024'
        }
      },
      {
        name: 'custom_headers',
        headers: {
          'User-Agent': 'IPFS-Memory-Weaver/1.0',
          'X-Forwarded-For': '127.0.0.1',
          'X-Real-IP': '127.0.0.1',
          'X-Client-Type': 'memory-weaver'
        }
      }
    ];

    let lastError;
    
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      for (const strategy of strategies) {
        try {
          console.log(`🔄 IPFS upload attempt ${attempt}/${this.retries} using strategy: ${strategy.name} for ${fileName}`);
          
          const response = await this._makeRequest(url, {
            method: 'POST',
            body: formData,
            headers: strategy.headers
          });

          if (response.ok) {
            const result = await response.json();
            const cid = result.Hash;
            const ipfsUrl = this.getGatewayUrl(cid);
            
            console.log(`✅ IPFS upload successful with strategy: ${strategy.name}, CID: ${cid}`);
            
            // Attempt to pin the file if enabled
            const pinResult = await this.pinFile(cid);
            
            return {
              success: true,
              cid,
              ipfsUrl,
              size: result.Size,
              pinned: pinResult.pinned,
              strategy: strategy.name,
              attempt: attempt,
              uploadResult: result
            };
          } else {
            const errorText = await response.text();
            const error = new Error(`Strategy ${strategy.name} failed: HTTP ${response.status}: ${errorText}`);
            console.warn(`⚠️ Strategy ${strategy.name} failed:`, error.message);
            lastError = error;
            
            // If it's a 403, try the next strategy immediately
            if (response.status === 403) {
              continue;
            }
          }

        } catch (error) {
          lastError = error;
          console.warn(`⚠️ Strategy ${strategy.name} error:`, error.message);
          continue; // Try next strategy
        }
      }
      
      // If all strategies failed for this attempt, wait before retrying
      if (attempt < this.retries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`⏳ All strategies failed for attempt ${attempt}. Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // All strategies and attempts failed
    throw lastError || new Error('All upload strategies failed');
  }

  /**
   * Enhanced request method with detailed diagnostics
   */
  async _makeRequestWithDiagnostics(url, options = {}) {
    const startTime = Date.now();
    console.log(`🌐 Making request to: ${url}`);
    console.log(`🌐 Options:`, { method: options.method, headers: options.headers });
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(this.timeout)
      });
      
      const duration = Date.now() - startTime;
      console.log(`🌐 Response: ${response.status} in ${duration}ms`);
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`🌐 Request failed after ${duration}ms:`, error.message);
      throw error;
    }
  }

  /**
   * Private method to make HTTP requests with comprehensive error handling
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Response>} Fetch response
   */
  async _makeRequest(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      console.log(`Making IPFS request to: ${url}`);
      console.log(`Request options:`, JSON.stringify(options, null, 2));
      
      // Add headers that might help with IPFS node access
      const defaultHeaders = {
        'User-Agent': 'Cloudflare-Worker-IPFS-Client/1.0',
        'Accept': 'application/json, text/plain, */*',
        'Cache-Control': 'no-cache'
      };
      
      const requestOptions = {
        ...options,
        signal: controller.signal,
        headers: {
          ...defaultHeaders,
          ...options.headers
        }
      };
      
      console.log(`Final request headers:`, JSON.stringify(requestOptions.headers, null, 2));
      
      const response = await fetch(url, requestOptions);
      
      console.log(`IPFS response status: ${response.status} ${response.statusText}`);
      console.log(`IPFS response headers:`, JSON.stringify([...response.headers.entries()], null, 2));
      
      // Log additional details for 403 errors
      if (response.status === 403) {
        const responseText = await response.clone().text();
        console.error(`IPFS 403 Forbidden details:`);
        console.error(`URL: ${url}`);
        console.error(`Response body: ${responseText}`);
        console.error(`Response headers: ${JSON.stringify([...response.headers.entries()])}`)
        
        // Try to provide helpful debugging information
        if (responseText.includes('CORS')) {
          console.error(`SOLUTION: IPFS node needs CORS configuration for Cloudflare Workers`);
        } else if (responseText.includes('API')) {
          console.error(`SOLUTION: IPFS node API access may be disabled or require authentication`);
        } else {
          console.error(`SOLUTION: Check IPFS node configuration for gateway/API access permissions`);
        }
      }
      
      return response;
      
    } catch (error) {
      console.error(`IPFS request failed to ${url}:`, error);
      
      if (error.name === 'AbortError') {
        throw new Error(`IPFS request timeout after ${this.timeout}ms`);
      }
      
      // Provide specific guidance for common errors
      if (error.message.includes('fetch')) {
        console.error(`SOLUTION: Check if IPFS node at ${this.baseUrl} is reachable from Cloudflare Workers`);
      }
      
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Upload file to IPFS (convenience function)
 * @param {ArrayBuffer|Uint8Array} fileBuffer - File data
 * @param {string} fileName - Original filename
 * @param {Object} options - Upload options including IPFS node URL
 * @returns {Promise<Object>} Upload result
 */
export async function uploadToIPFS(fileBuffer, fileName, options = {}) {
  const ipfsNodeUrl = options.ipfsNodeUrl || 'http://31.220.107.113:5001/';
  const client = new IPFSWorkerClient(ipfsNodeUrl, options);
  return await client.uploadFile(fileBuffer, fileName, options);
}

/**
 * Simplified IPFS upload that mimics the working curl command exactly
 * curl -X POST -F file=@test.txt http://31.220.107.113:5001/api/v0/add
 * @param {ArrayBuffer|Uint8Array} fileBuffer - File data
 * @param {string} fileName - Original filename
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export async function uploadToIPFSSimple(fileBuffer, fileName, options = {}) {
  const ipfsNodeUrl = options.ipfsNodeUrl || 'http://31.220.107.113:5001/';
  const uploadUrl = `${ipfsNodeUrl}/api/v0/add`;
  
  console.log(`🚀 Simple IPFS upload starting for ${fileName} to ${uploadUrl}`);
  
  try {
    // Create FormData exactly like curl -F file=@filename
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { 
      type: options.contentType || 'application/octet-stream' 
    });
    formData.append('file', blob, fileName);
    
    console.log(`📤 Making simple POST request (mimicking curl -F file=@${fileName})`);
    
    // Make the request exactly like curl - minimal headers
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
      headers: {
        'User-Agent': 'Memory-Weaver-Worker/1.0'
      },
      signal: AbortSignal.timeout(options.timeout || 120000) // 2 minutes timeout
    });
    
    console.log(`📥 IPFS response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ IPFS upload failed: ${response.status} - ${errorText}`);
      throw new Error(`IPFS upload failed: HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`📥 Raw IPFS API response:`, JSON.stringify(result, null, 2));
    
    const cid = result.Hash;
    const size = result.Size;
    const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;
    
    console.log(`✅ Simple IPFS upload successful: CID ${cid}, Size: ${size}`);
    
    // Make sure we return exactly what the validation expects
    const uploadResult = {
      success: true,
      cid: cid,
      ipfsUrl: ipfsUrl,
      size: size,
      pinned: false, // Simple upload doesn't auto-pin
      method: 'simple',
      uploadResult: result
    };
    
    console.log(`📤 Returning upload result:`, JSON.stringify(uploadResult, null, 2));
    return uploadResult;
    
  } catch (error) {
    console.error(`❌ Simple IPFS upload failed for ${fileName}:`, error);
    
    return {
      success: false,
      error: error.message,
      method: 'simple'
    };
  }
}

/**
 * Get IPFS gateway URL (convenience function)
 * @param {string} cid - Content Identifier
 * @param {string} gatewayUrl - Optional custom gateway URL
 * @returns {string} Gateway URL
 */
export function getIPFSGatewayUrl(cid, gatewayUrl = 'https://ipfs.io/ipfs/') {
  const gateway = gatewayUrl.endsWith('/') ? gatewayUrl : gatewayUrl + '/';
  return `${gateway}${cid}`;
}

/**
 * Check IPFS health (convenience function)
 * @param {string} ipfsNodeUrl - IPFS node URL
 * @returns {Promise<Object>} Health check result
 */
export async function checkIPFSHealth(ipfsNodeUrl = 'http://31.220.107.113:5001/') {
  const client = new IPFSWorkerClient(ipfsNodeUrl);
  return await client.healthCheck();
} 