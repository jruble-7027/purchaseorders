import React, { useState } from 'react';
import { FileText, Image as ImageIcon, ExternalLink, Eye, X } from 'lucide-react';

export default function ReceiptViewer({ receipts = [] }) {
  const [selectedImage, setSelectedImage] = useState(null);

  if (!receipts || receipts.length === 0) {
    return (
      <div className="text-xs text-slate-400 italic bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
        No receipt attachments uploaded.
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {receipts.map((receipt, idx) => {
          const isPdf = receipt.type === 'application/pdf' || receipt.name?.toLowerCase().endsWith('.pdf');

          return (
            <div
              key={idx}
              className="group relative flex items-center p-2.5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition"
            >
              {/* Icon / Thumbnail */}
              <div className="w-10 h-10 shrink-0 rounded bg-slate-100 flex items-center justify-center mr-3 overflow-hidden border border-slate-200">
                {isPdf ? (
                  <FileText className="w-5 h-5 text-rose-500" />
                ) : (
                  <img
                    src={receipt.url}
                    alt={receipt.name}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setSelectedImage(receipt.url)}
                  />
                )}
              </div>

              {/* File Info */}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 truncate" title={receipt.name}>
                  {receipt.name || `Receipt_${idx + 1}`}
                </p>
                <p className="text-[10px] text-slate-400">
                  {receipt.size ? `${(receipt.size / 1024).toFixed(1)} KB • ` : ''}
                  {isPdf ? 'PDF Document' : 'Image File'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-1 pl-2">
                {isPdf ? (
                  <a
                    href={receipt.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-50 transition"
                    title="Open PDF Document"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedImage(receipt.url)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-50 transition"
                    title="Zoom Image"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for viewing full size image */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg p-2 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 bg-slate-900/70 text-white rounded-full p-1.5 hover:bg-slate-900 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImage}
              alt="Receipt Preview"
              className="max-h-[80vh] w-auto mx-auto object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
}
