import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const IPFS_API_URL = 'http://127.0.0.1:5001/api/v0';

export async function GET(req: NextRequest) {
  try {
    // Test IPFS daemon connectivity
    const response = await axios.post(`${IPFS_API_URL}/version`, {}, {
      timeout: 5000, // 5 second timeout
    });

    const ipfsVersion = response.data;

    return NextResponse.json({
      success: true,
      status: 'IPFS daemon is running',
      version: ipfsVersion.Version,
      apiUrl: IPFS_API_URL,
      gatewayUrl: 'http://127.0.0.1:8080',
    });

  } catch (error) {
    console.error('IPFS status check failed:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        return NextResponse.json({
          success: false,
          status: 'IPFS daemon is not running',
          error: 'Connection refused - please start your IPFS daemon',
          instructions: [
            'Run: ipfs daemon',
            'Make sure IPFS is listening on 127.0.0.1:5001',
            'Check that your IPFS node is properly initialized'
          ]
        }, { status: 503 });
      }
      
      return NextResponse.json({
        success: false,
        status: 'IPFS connection error',
        error: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: false,
      status: 'Unknown error',
      error: 'Failed to connect to IPFS daemon',
    }, { status: 500 });
  }
} 