import React from 'react';
import { ISessionParticipant, ICursorPosition, ISelectionRange } from '../../services/collaboration/websocketServer';

interface IParticipantCursorsProps {
  cursors: Map<string, ICursorPosition>;
  selections: Map<string, ISelectionRange>;
  participants: Map<string, ISessionParticipant>;
  currentUserId: string;
}

interface IParticipantCursorProps {
  userId: string;
  position: ICursorPosition;
  participant: ISessionParticipant;
}

interface IParticipantSelectionProps {
  userId: string;
  selection: ISelectionRange;
  participant: ISessionParticipant;
}

const ParticipantCursor: React.FC<IParticipantCursorProps> = ({
  userId,
  position,
  participant
}) => {
  // Don't show cursor if position is invalid or user is away
  if (position.x < 0 || position.y < 0 || participant.status === 'away') {
    return null;
  }

  // Generate a consistent color for each user
  const getUserColor = (userId: string) => {
    const colors = [
      '#3B82F6', // blue
      '#EF4444', // red
      '#10B981', // emerald
      '#F59E0B', // amber
      '#8B5CF6', // violet
      '#EC4899', // pink
      '#06B6D4', // cyan
      '#84CC16', // lime
    ];
    
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  const color = getUserColor(userId);

  return (
    <div
      className=\"absolute pointer-events-none z-50 transform -translate-x-1 -translate-y-1\"\n      style={{\n        left: position.x,\n        top: position.y,\n        zIndex: 1000\n      }}\n    >\n      {/* Cursor Pointer */}\n      <div className=\"relative\">\n        <svg\n          width=\"20\"\n          height=\"20\"\n          viewBox=\"0 0 20 20\"\n          className=\"drop-shadow-sm\"\n        >\n          <path\n            d=\"M2 2l6 14 2-6 6-2L2 2z\"\n            fill={color}\n            stroke=\"white\"\n            strokeWidth=\"1\"\n          />\n        </svg>\n        \n        {/* User Name Label */}\n        <div\n          className=\"absolute left-5 top-0 px-2 py-1 text-xs text-white rounded shadow-lg whitespace-nowrap\"\n          style={{ backgroundColor: color }}\n        >\n          <div className=\"flex items-center space-x-1\">\n            {participant.userAvatar && (\n              <img\n                src={participant.userAvatar}\n                alt={participant.userName}\n                className=\"w-3 h-3 rounded-full\"\n              />\n            )}\n            <span>{participant.userName}</span>\n            {participant.status === 'idle' && (\n              <div className=\"w-2 h-2 bg-yellow-400 rounded-full opacity-75\"></div>\n            )}\n          </div>\n        </div>\n      </div>\n    </div>\n  );\n};\n\nconst ParticipantSelection: React.FC<IParticipantSelectionProps> = ({\n  userId,\n  selection,\n  participant\n}) => {\n  // This would need to be implemented based on your specific UI structure\n  // For now, we'll show a simple highlight overlay\n  \n  const getUserColor = (userId: string) => {\n    const colors = [\n      '#3B82F6', // blue\n      '#EF4444', // red\n      '#10B981', // emerald\n      '#F59E0B', // amber\n      '#8B5CF6', // violet\n      '#EC4899', // pink\n      '#06B6D4', // cyan\n      '#84CC16', // lime\n    ];\n    \n    const hash = userId.split('').reduce((a, b) => {\n      a = ((a << 5) - a) + b.charCodeAt(0);\n      return a & a;\n    }, 0);\n    \n    return colors[Math.abs(hash) % colors.length];\n  };\n\n  const color = getUserColor(userId);\n\n  return (\n    <div\n      className=\"absolute pointer-events-none border-2 border-dashed rounded opacity-50\"\n      style={{\n        borderColor: color,\n        backgroundColor: `${color}20`, // 20% opacity\n        // Position would be calculated based on selection range\n        // This is a simplified example\n        left: selection.startCol * 100, // Approximate positioning\n        top: selection.startRow * 30,\n        width: (selection.endCol - selection.startCol + 1) * 100,\n        height: (selection.endRow - selection.startRow + 1) * 30,\n        zIndex: 999\n      }}\n    >\n      <div\n        className=\"absolute -top-6 left-0 px-2 py-1 text-xs text-white rounded shadow-sm whitespace-nowrap\"\n        style={{ backgroundColor: color }}\n      >\n        {participant.userName} (selecting)\n      </div>\n    </div>\n  );\n};\n\nexport const ParticipantCursors: React.FC<IParticipantCursorsProps> = ({\n  cursors,\n  selections,\n  participants,\n  currentUserId\n}) => {\n  return (\n    <div className=\"absolute inset-0 pointer-events-none\">\n      {/* Render cursors */}\n      {Array.from(cursors.entries()).map(([userId, position]) => {\n        if (userId === currentUserId) return null;\n        \n        const participant = participants.get(userId);\n        if (!participant) return null;\n\n        return (\n          <ParticipantCursor\n            key={`cursor-${userId}`}\n            userId={userId}\n            position={position}\n            participant={participant}\n          />\n        );\n      })}\n\n      {/* Render selections */}\n      {Array.from(selections.entries()).map(([userId, selection]) => {\n        if (userId === currentUserId) return null;\n        \n        const participant = participants.get(userId);\n        if (!participant) return null;\n\n        return (\n          <ParticipantSelection\n            key={`selection-${userId}`}\n            userId={userId}\n            selection={selection}\n            participant={participant}\n          />\n        );\n      })}\n    </div>\n  );\n};