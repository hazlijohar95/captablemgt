import React, { useState } from 'react';
import { ISessionParticipant } from '../../services/collaboration/websocketServer';
import { XMarkIcon, ExclamationTriangleIcon, UserIcon } from '@heroicons/react/24/outline';

interface IConflictResolutionModalProps {
  conflict: {
    conflictId: string;
    elementId: string;
    field: string;
    baseValue: any;
    conflictingChanges: Array<{
      userId: string;
      value: any;
      timestamp: number;
    }>;
  };
  participants: Map<string, ISessionParticipant>;
  onResolve: (conflictId: string, selectedValue: any) => void;
  onCancel: () => void;
}

export const ConflictResolutionModal: React.FC<IConflictResolutionModalProps> = ({
  conflict,
  participants,
  onResolve,
  onCancel
}) => {
  const [selectedValue, setSelectedValue] = useState<any>(null);
  const [customValue, setCustomValue] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleResolve = () => {
    const valueToUse = showCustomInput ? customValue : selectedValue;
    if (valueToUse !== null && valueToUse !== undefined) {
      onResolve(conflict.conflictId, valueToUse);
    }
  };

  const getParticipantName = (userId: string) => {
    const participant = participants.get(userId);
    return participant?.userName || userId;
  };

  const getParticipantAvatar = (userId: string) => {
    const participant = participants.get(userId);
    return participant?.userAvatar;
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return 'Empty';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-500" />
            <h3 className="text-lg font-medium text-gray-900">Resolve Editing Conflict</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Conflict Description */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-2">
              Multiple users edited the same field simultaneously. Choose which version to keep:
            </p>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm">
                <span className="font-medium text-gray-900">Field:</span>{' '}
                <span className="font-mono text-gray-700">{conflict.field}</span>
              </div>
              <div className="text-sm mt-1">
                <span className="font-medium text-gray-900">Element:</span>{' '}
                <span className="font-mono text-gray-700">{conflict.elementId}</span>
              </div>
            </div>
          </div>

          {/* Original Value */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Original Value</h4>
            <div className="border border-gray-200 rounded-lg">
              <label className="flex items-start p-4 cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="conflictResolution"
                  value="original"
                  checked={selectedValue === conflict.baseValue}
                  onChange={() => {
                    setSelectedValue(conflict.baseValue);
                    setShowCustomInput(false);
                  }}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium text-gray-900">Original</span>
                    <span className="text-xs text-gray-500">Before changes</span>
                  </div>
                  <div className="bg-gray-100 rounded p-2 font-mono text-sm text-gray-800">
                    {formatValue(conflict.baseValue)}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Conflicting Changes */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Conflicting Versions</h4>
            <div className="space-y-3">
              {conflict.conflictingChanges.map((change, index) => {
                const participant = participants.get(change.userId);
                return (
                  <div key={index} className="border border-gray-200 rounded-lg">
                    <label className="flex items-start p-4 cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="conflictResolution"
                        value={`change-${index}`}
                        checked={selectedValue === change.value}
                        onChange={() => {
                          setSelectedValue(change.value);
                          setShowCustomInput(false);
                        }}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        {/* Author Info */}
                        <div className="flex items-center space-x-2 mb-2">
                          {getParticipantAvatar(change.userId) ? (
                            <img
                              src={getParticipantAvatar(change.userId)}
                              alt={getParticipantName(change.userId)}
                              className="w-5 h-5 rounded-full"
                            />
                          ) : (
                            <UserIcon className="w-5 h-5 text-gray-400" />
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {getParticipantName(change.userId)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(change.timestamp)}
                          </span>
                        </div>
                        
                        {/* Value */}
                        <div className="bg-blue-50 border border-blue-200 rounded p-2 font-mono text-sm text-gray-800">
                          {formatValue(change.value)}
                        </div>
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Value Option */}
          <div className="mb-6">
            <div className="border border-gray-200 rounded-lg">
              <label className="flex items-start p-4 cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="conflictResolution"
                  value="custom"
                  checked={showCustomInput}
                  onChange={() => {
                    setShowCustomInput(true);
                    setSelectedValue(null);
                  }}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium text-gray-900">Custom Value</span>
                    <span className="text-xs text-gray-500">Enter your own value</span>
                  </div>
                  {showCustomInput && (
                    <textarea
                      value={customValue}
                      onChange={(e) => setCustomValue(e.target.value)}
                      placeholder="Enter custom value..."
                      className="w-full p-2 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={selectedValue === null && !showCustomInput}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              selectedValue !== null || showCustomInput
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            Resolve Conflict
          </button>
        </div>
      </div>
    </div>
  );
};