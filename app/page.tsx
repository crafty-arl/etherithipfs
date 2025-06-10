'use client';

import { useState, useEffect } from 'react';

interface UploadedFile {
  id: string;
  filename: string;
  cid: string;
  uploadedAt: string;
  size: string;
}

export default function Home() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load files on component mount
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      
      if (data.success) {
        setUploadedFiles(data.files);
      } else {
        console.error('Failed to fetch files:', data.error);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFileUpload(files);
  };

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    setError(null);
    
    try {
      // Upload files one by one
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Upload failed');
        }

        // Add the new file to the list
        const newFile: UploadedFile = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          filename: data.filename,
          cid: data.cid,
          uploadedAt: data.uploadedAt,
          size: data.size,
        };

        setUploadedFiles(prev => [newFile, ...prev]);
      }

      // Show success message
      setError(`Successfully uploaded ${files.length} file(s) to Etherith Network!`);
      
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    // Check if clipboard API is available
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setError('CID copied to clipboard!');
        setTimeout(() => setError(null), 2000);
      }).catch(() => {
        // Fallback if clipboard API fails
        fallbackCopyToClipboard(text);
      });
    } else {
      // Fallback for browsers without clipboard API
      fallbackCopyToClipboard(text);
    }
  };

  const fallbackCopyToClipboard = (text: string) => {
    // Create a temporary textarea element
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const result = document.execCommand('copy');
      if (result) {
        setError('CID copied to clipboard!');
        setTimeout(() => setError(null), 2000);
      } else {
        setError('Failed to copy CID. Please copy manually.');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      setError('Copy not supported. Please copy the CID manually.');
      setTimeout(() => setError(null), 3000);
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Etherith
            </h1>
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Decentralized Memory Storage
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Your files, permanently pinned to the decentralized web
          </p>
        </header>

        {/* Error/Success Message */}
        {error && (
          <div className={`mb-6 p-4 rounded-lg flex items-center justify-between ${
            error.includes('Successfully') || error.includes('copied')
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
          }`}>
            <span>{error}</span>
            <button
              onClick={clearError}
              className="text-current hover:opacity-70"
            >
              ×
            </button>
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-slate-800 dark:text-slate-200">
            Upload Files
          </h2>
          
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              isDragOver 
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-slate-300 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="text-blue-600 dark:text-blue-400 font-medium">Uploading to Etherith Network...</p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Drop files here or click to browse
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Supports all file types • Max 100MB per file
                    </p>
                  </div>
                  
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <span className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                      Select Files
                    </span>
                  </label>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Files List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-slate-800 dark:text-slate-200">
            My Files
          </h2>
          
          {uploadedFiles.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-slate-500 dark:text-slate-400">No files uploaded yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                Make sure your IPFS daemon is running on localhost:5001
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-sm font-medium text-slate-500 dark:text-slate-400 pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="lg:col-span-4">Filename</div>
                <div className="lg:col-span-4">Content ID (CID)</div>
                <div className="lg:col-span-2">Size</div>
                <div className="lg:col-span-2 text-right">Actions</div>
              </div>
              
              <div className="space-y-4 mt-4">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg px-2 -mx-2 transition-colors">
                    <div className="lg:col-span-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {file.filename}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(file.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="lg:col-span-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded font-mono truncate flex-1">
                          {file.cid}
                        </code>
                        <button
                          onClick={() => copyToClipboard(file.cid)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                          title="Copy CID"
                        >
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="lg:col-span-2">
                      <span className="text-slate-600 dark:text-slate-300">
                        {file.size}
                      </span>
                    </div>
                    
                    <div className="lg:col-span-2 flex justify-end gap-2">
                      <a
                        href={`http://100.75.134.128:8080/ipfs/${file.cid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                        title="Download from Tailscale IPFS gateway"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Files are permanently pinned to the Etherith network and available at:
            <br />
            <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded mt-1 inline-block">
              http://100.75.134.128:8080/ipfs/&lt;CID&gt;
            </code>
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            Tailscale IPFS Gateway • Production: gateway.etherith.io
          </p>
        </div>
      </div>
    </div>
  );
}
