"use client";

import React, { useState, useRef } from 'react';
import './globals.css';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
      setTranscription(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
      setTranscription(null);
    }
  };

  const handleTranscribe = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setTranscription(""); // Start empty for streaming
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed. Please ensure the backend is running.');
      }

      if (!response.body) {
        throw new Error('No response body from server.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let isStreamComplete = false;
      while (!isStreamComplete) {
        const { value, done } = await reader.read();
        
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') {
                isStreamComplete = true;
                break;
              }
              
              if (dataStr) {
                try {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.error) {
                    setError(parsed.error);
                    isStreamComplete = true;
                    break;
                  }
                  if (parsed.text) {
                    setTranscription((prev) => (prev ? prev + parsed.text : parsed.text));
                  }
                } catch (e) {
                  console.error('Error parsing SSE chunk:', e);
                }
              }
            }
          }
        }
        
        if (done) {
          isStreamComplete = true;
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during transcription.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (transcription) {
      navigator.clipboard.writeText(transcription);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <main className="container">
      <div className="glass-card">
        <div className="header">
          <h1>Whisper UI</h1>
          <p>Transform your audio into text instantly.</p>
        </div>

        <div 
          className={`upload-area ${isDragging ? 'drag-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <p>
            {file ? <strong>{file.name}</strong> : 'Drag & drop an audio file here, or click to select'}
          </p>
          <input 
            type="file" 
            className="file-input" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            accept="audio/*"
            style={{ display: 'none' }}
          />
        </div>

        <button 
          className="btn-primary" 
          onClick={handleTranscribe} 
          disabled={!file || isLoading}
        >
          {isLoading ? (
            <>
              <div className="spinner"></div>
              Transcribing... (Streaming live!)
            </>
          ) : (
            'Transcribe Audio'
          )}
        </button>

        {error && (
          <div className="error-text">
            {error}
          </div>
        )}

        {transcription !== null && (
          <div className="result-box">
            <div className="result-header">
              <h3>Transcription</h3>
              <button className="copy-btn" onClick={handleCopy} title="Copy to clipboard">
                {isCopied ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="result-text">{transcription || "Listening..."}</div>
          </div>
        )}
      </div>
    </main>
  );
}
