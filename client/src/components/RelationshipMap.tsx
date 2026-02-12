// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Character } from '../services/api';

interface Relationship {
  characterId: string;
  relatedCharacterId: string;
  relationshipType: string;
}

interface RelationshipMapProps {
  characters: Character[];
  onClose: () => void;
  onAddRelationship?: (fromCharacterId: string, toCharacterId: string, relationshipType: string) => void;
}

interface Node {
  id: string;
  x: number;
  y: number;
  character: Character;
}

interface Edge {
  from: string;
  to: string;
  type: string;
}

export default function RelationshipMap({ characters, onClose, onAddRelationship }: RelationshipMapProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRelationship, setNewRelationship] = useState({
    fromCharacterId: '',
    toCharacterId: '',
    relationshipType: ''
  });

  // Parse relationships from characters
  useEffect(() => {
    const parsedNodes: Node[] = [];
    const parsedEdges: Edge[] = [];

    // Create nodes from characters
    characters.forEach((char, index) => {
      // Arrange in a circle
      const angle = (index / characters.length) * 2 * Math.PI;
      const radius = Math.min(400, 100 + characters.length * 30);
      const x = 350 + radius * Math.cos(angle);
      const y = 300 + radius * Math.sin(angle);

      parsedNodes.push({
        id: char.id,
        x,
        y,
        character: char
      });

      // Parse relationships_json
      if (char.relationships_json) {
        try {
          const relationships = JSON.parse(char.relationships_json);
          if (Array.isArray(relationships)) {
            relationships.forEach((rel: Relationship) => {
              if (rel.characterId === char.id) {
                parsedEdges.push({
                  from: rel.characterId,
                  to: rel.relatedCharacterId,
                  type: rel.relationshipType
                });
              }
            });
          }
        } catch (e) {
          console.error('Failed to parse relationships_json:', e);
        }
      }
    });

    setNodes(parsedNodes);
    setEdges(parsedEdges);
  }, [characters]);

  const handleAddRelationship = () => {
    if (onAddRelationship && newRelationship.fromCharacterId && newRelationship.toCharacterId && newRelationship.relationshipType) {
      onAddRelationship(newRelationship.fromCharacterId, newRelationship.toCharacterId, newRelationship.relationshipType);
      setNewRelationship({ fromCharacterId: '', toCharacterId: '', relationshipType: '' });
      setShowAddDialog(false);
    }
  };

  const handleNodeClick = (node: Node) => {
    // Pre-fill add dialog with this character as source
    setNewRelationship({
      fromCharacterId: node.id,
      toCharacterId: '',
      relationshipType: ''
    });
    setShowAddDialog(true);
  };

  const handleEdgeClick = (edge: Edge, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEdge(edge);
  };

  // Get relationship color based on type
  const getRelationshipColor = (type: string): string => {
    const colors: { [key: string]: string } = {
      'family': 'bg-blue-500',
      'friend': 'bg-green-500',
      'enemy': 'bg-red-500',
      'romantic': 'bg-pink-500',
      'mentor': 'bg-purple-500',
      'ally': 'bg-cyan-500',
      'default': 'bg-gray-500'
    };
    return colors[type.toLowerCase()] || colors['default'];
  };

  const availableCharacters = characters.filter(c => c.id !== newRelationship.fromCharacterId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Character Relationships</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {characters.length} characters • {edges.length} relationships
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
          <div
            ref={canvasRef}
            className="relative bg-white dark:bg-gray-800 rounded-xl shadow-inner"
            style={{ width: '700px', height: '600px', margin: '0 auto' }}
          >
            {/* SVG Layer for edges */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 1 }}
            >
              {edges.map((edge, index) => {
                const fromNode = nodes.find(n => n.id === edge.from);
                const toNode = nodes.find(n => n.id === edge.to);

                if (!fromNode || !toNode) return null;

                return (
                  <g key={`${edge.from}-${edge.to}-${index}`}>
                    <line
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      className={`pointer-events-auto cursor-pointer ${selectedEdge === edge ? 'stroke-purple-600' : 'stroke-gray-400'}`}
                      strokeWidth={selectedEdge === edge ? '3' : '2'}
                      strokeDasharray={selectedEdge === edge ? '0' : '5,5'}
                      onClick={(e) => handleEdgeClick(edge, e)}
                    />
                    {/* Edge label */}
                    <text
                      x={(fromNode.x + toNode.x) / 2}
                      y={(fromNode.y + toNode.y) / 2}
                      className="fill-gray-600 dark:fill-gray-400 text-xs pointer-events-none select-none"
                      textAnchor="middle"
                      dy="-5"
                    >
                      {edge.type}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Node Layer */}
            {nodes.map((node) => (
              <div
                key={node.id}
                onClick={() => handleNodeClick(node)}
                className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform"
                style={{
                  left: node.x,
                  top: node.y,
                  zIndex: 2
                }}
                title={node.character.name}
              >
                {/* Character avatar circle */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg border-4 border-white dark:border-gray-800">
                  {node.character.name.charAt(0).toUpperCase()}
                </div>
                {/* Character name */}
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white bg-white/90 dark:bg-gray-800/90 px-2 py-1 rounded shadow">
                    {node.character.name}
                  </p>
                </div>
                {/* Character role indicator */}
                {node.character.role_in_story && (
                  <div className="absolute -top-2 -right-2">
                    <span className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded-full shadow">
                      {node.character.role_in_story}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {Object.entries({
              'Family': 'family',
              'Friend': 'friend',
              'Enemy': 'enemy',
              'Romantic': 'romantic',
              'Mentor': 'mentor',
              'Ally': 'ally'
            }).map(([label, type]) => (
              <div key={type} className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow">
                <div className={`w-4 h-1 rounded ${getRelationshipColor(type)}`}></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Click on a character to add a relationship
          </p>
          <button
            onClick={() => setShowAddDialog(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            Add Relationship
          </button>
        </div>
      </div>

      {/* Add Relationship Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Relationship</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From Character
                </label>
                <select
                  value={newRelationship.fromCharacterId}
                  onChange={(e) => setNewRelationship({ ...newRelationship, fromCharacterId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select character...</option>
                  {characters.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  To Character
                </label>
                <select
                  value={newRelationship.toCharacterId}
                  onChange={(e) => setNewRelationship({ ...newRelationship, toCharacterId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select character...</option>
                  {availableCharacters.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Relationship Type
                </label>
                <select
                  value={newRelationship.relationshipType}
                  onChange={(e) => setNewRelationship({ ...newRelationship, relationshipType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select type...</option>
                  <option value="family">Family</option>
                  <option value="friend">Friend</option>
                  <option value="enemy">Enemy</option>
                  <option value="romantic">Romantic</option>
                  <option value="mentor">Mentor</option>
                  <option value="ally">Ally</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRelationship}
                disabled={!newRelationship.fromCharacterId || !newRelationship.toCharacterId || !newRelationship.relationshipType}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Relationship
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edge Detail Dialog */}
      {selectedEdge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Relationship Details</h3>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">From:</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {nodes.find(n => n.id === selectedEdge.from)?.character?.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">To:</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {nodes.find(n => n.id === selectedEdge.to)?.character?.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Type:</p>
                <p className="font-semibold text-gray-900 dark:text-white capitalize">
                  {selectedEdge.type}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedEdge(null)}
              className="w-full mt-6 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
