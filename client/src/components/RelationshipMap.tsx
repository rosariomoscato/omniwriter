// @ts-nocheck
import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Character } from '../services/api';

interface Relationship {
  characterId: string;
  relatedCharacterId: string;
  relationshipType: string;
}

interface RelationshipMapProps {
  characters: Character[];
  projectTitle?: string;
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

// Canvas dimensions - responsive based on character count
function getCanvasDimensions(charCount: number): { width: number; height: number } {
  if (charCount <= 4) return { width: 600, height: 500 };
  if (charCount <= 8) return { width: 700, height: 600 };
  if (charCount <= 12) return { width: 800, height: 700 };
  return { width: 900, height: 800 };
}

export default function RelationshipMap({ characters, projectTitle, onClose, onAddRelationship }: RelationshipMapProps) {
  const { t } = useTranslation();
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

  // Calculate canvas dimensions based on character count
  const canvasDims = getCanvasDimensions(characters.length);

  // Parse relationships from characters
  useEffect(() => {
    const parsedNodes: Node[] = [];
    const parsedEdges: Edge[] = [];

    // Dynamic center and radius based on canvas size and character count
    const centerX = canvasDims.width / 2;
    const centerY = canvasDims.height / 2;
    // Leave padding of 60px for node size (32px radius + name label) on each side
    const maxRadius = Math.min(centerX, centerY) - 80;
    // Scale radius based on number of characters, min 80, max limited by canvas
    const radius = Math.min(maxRadius, Math.max(80, 60 + characters.length * 25));

    // Create nodes from characters
    characters.forEach((char, index) => {
      // Arrange in a circle, starting from the top (-PI/2 offset)
      const angle = (index / characters.length) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

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
  }, [characters, canvasDims.width, canvasDims.height]);

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

  // Get relationship stroke color for SVG lines
  const getEdgeStrokeColor = (type: string): string => {
    const colors: { [key: string]: string } = {
      'family': '#3b82f6',
      'friend': '#22c55e',
      'enemy': '#ef4444',
      'romantic': '#ec4899',
      'mentor': '#a855f7',
      'ally': '#06b6d4',
      'default': '#9ca3af'
    };
    return colors[type.toLowerCase()] || colors['default'];
  };

  // Get relationship color based on type (for legend)
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('relationships.title')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {characters.length} {t('relationships.charactersCount').replace('{{count}}', String(characters.length))} • {edges.length} {t('relationships.relationshipsCount').replace('{{count}}', String(edges.length))}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={t('relationships.close')}
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
          <div
            ref={canvasRef}
            className="relative bg-white dark:bg-gray-800 rounded-xl shadow-inner"
            style={{ width: `${canvasDims.width}px`, height: `${canvasDims.height}px`, margin: '0 auto' }}
          >
            {/* Center visual indicator */}
            <div
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none select-none"
              style={{
                left: canvasDims.width / 2,
                top: canvasDims.height / 2,
                zIndex: 0
              }}
            >
              <div className={`rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 border-2 border-dashed border-purple-300 dark:border-purple-600 flex items-center justify-center ${characters.length <= 4 ? 'w-20 h-20' : characters.length <= 8 ? 'w-16 h-16' : 'w-12 h-12'}`}>
                <Users className={`text-purple-400 dark:text-purple-500 ${characters.length <= 4 ? 'w-8 h-8' : 'w-6 h-6'}`} />
              </div>
              {projectTitle && (
                <p className="mt-2 text-xs text-purple-400 dark:text-purple-500 font-medium max-w-[120px] text-center truncate">
                  {projectTitle}
                </p>
              )}
            </div>

            {/* SVG Layer for edges */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 1 }}
            >
              {edges.map((edge, index) => {
                const fromNode = nodes.find(n => n.id === edge.from);
                const toNode = nodes.find(n => n.id === edge.to);

                if (!fromNode || !toNode) return null;

                const strokeColor = getEdgeStrokeColor(edge.type);
                const isSelected = selectedEdge === edge;

                return (
                  <g key={`${edge.from}-${edge.to}-${index}`}>
                    <line
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke={isSelected ? '#9333ea' : strokeColor}
                      className="pointer-events-auto cursor-pointer"
                      strokeWidth={isSelected ? '3' : '2'}
                      strokeDasharray={isSelected ? '0' : '5,5'}
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
                <span className="text-sm text-gray-700 dark:text-gray-300">{t(`relationships.types.${type}`)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('relationships.clickToAdd')}
          </p>
          <button
            onClick={() => setShowAddDialog(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            {t('relationships.addRelationship')}
          </button>
        </div>
      </div>

      {/* Add Relationship Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('relationships.addDialogTitle')}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('relationships.fromCharacter')}
                </label>
                <select
                  value={newRelationship.fromCharacterId}
                  onChange={(e) => setNewRelationship({ ...newRelationship, fromCharacterId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">{t('relationships.selectCharacter')}</option>
                  {characters.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('relationships.toCharacter')}
                </label>
                <select
                  value={newRelationship.toCharacterId}
                  onChange={(e) => setNewRelationship({ ...newRelationship, toCharacterId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">{t('relationships.selectCharacter')}</option>
                  {availableCharacters.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('relationships.typeLabel')}
                </label>
                <select
                  value={newRelationship.relationshipType}
                  onChange={(e) => setNewRelationship({ ...newRelationship, relationshipType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">{t('relationships.selectType')}</option>
                  <option value="family">{t('relationships.types.family')}</option>
                  <option value="friend">{t('relationships.types.friend')}</option>
                  <option value="enemy">{t('relationships.types.enemy')}</option>
                  <option value="romantic">{t('relationships.types.romantic')}</option>
                  <option value="mentor">{t('relationships.types.mentor')}</option>
                  <option value="ally">{t('relationships.types.ally')}</option>
                  <option value="other">{t('relationships.types.other')}</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('relationships.cancel')}
              </button>
              <button
                onClick={handleAddRelationship}
                disabled={!newRelationship.fromCharacterId || !newRelationship.toCharacterId || !newRelationship.relationshipType}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('relationships.add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edge Detail Dialog */}
      {selectedEdge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('relationships.details')}</h3>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('relationships.from')}</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {nodes.find(n => n.id === selectedEdge.from)?.character?.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('relationships.to')}</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {nodes.find(n => n.id === selectedEdge.to)?.character?.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('relationships.type')}</p>
                <p className="font-semibold text-gray-900 dark:text-white capitalize">
                  {selectedEdge.type}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedEdge(null)}
              className="w-full mt-6 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              {t('relationships.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
