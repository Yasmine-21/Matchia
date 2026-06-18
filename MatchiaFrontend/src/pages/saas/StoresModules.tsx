
import { useState, useEffect, useRef } from 'react';


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  Smartphone, Home, Car, HeartPulse, Calculator, GitCompare,
  GraduationCap, Plane, ShoppingCart, Briefcase, BookOpen, Bot,
  Image as ImageIcon, Settings as SettingsIcon, X, AlertTriangle,
  BarChart, Bell, Shield, Mail, Users, Globe,
  Plus, Edit, Loader2, ChevronDown, ChevronUp, MoreVertical, Trash2, Filter
} from 'lucide-react';
import { storeService } from '../../services/storeService';
import { moduleService } from '../../services/moduleService';
import { ModuleDto, StoreDto, ModuleAssignment, ModuleParameter } from '../../types/apiTypes';

// storeIconMap
const storeIconMap: Record<string, any> = {
  Car: Car,
  Smartphone: Smartphone,
  HeartPulse: HeartPulse,
  Home: Home,
  Heart: HeartPulse,
  Education: GraduationCap,
  Travel: Plane,
  Shopping: ShoppingCart,
  Business: Briefcase
};

// moduleIconMap
const moduleIconMap: Record<string, any> = {
  Calculator: Calculator,
  GitCompare: GitCompare,
  BookOpen: BookOpen,
  Bot: Bot,
  ImageIcon: ImageIcon,
  Image: ImageIcon,
  Settings: SettingsIcon,
  BarChart: BarChart,
  Bell: Bell,
  Shield: Shield,
  Mail: Mail,
  Users: Users,
  Globe: Globe
};

// colorPalette
const colorPalette = [
  '#f97316', // orange
  '#3b82f6', // blue
  '#10b981', // green
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#6366f1'  // indigo
];

// getIconColor()
function getIconColor(index: number): string {
  return colorPalette[index % colorPalette.length];
}

function formatMonthlyPrice(price?: number | null): string {
  const value = typeof price === 'number' && Number.isFinite(price) ? price : 0;
  return `${value} DT / mois`;
}

function parseRequiredPrice(value: string): number | null {
  if (value.trim() === '') return null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
}


// ============ 3. INTERFACES & TYPES ============
// StoreUIDto
interface StoreUIDto extends StoreDto {
  modules: number;
  IconComponent: any;
  iconName: string;
}

// ModuleUIDto
interface ModuleUIDto extends ModuleDto {
  IconComponent: any;
  iconName: string;
}

// LocalModuleParameter
interface LocalModuleParameter {
  name: string;
  code: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select'| 'image';
  required: boolean;
}


// ============ 4. SOUS-COMPOSANTS ============
// DropdownMenu
function DropdownMenu({
  items,
  children
}: {
  items: { label: string; onClick: () => void; variant?: 'default' | 'danger' }[];
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        {children}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                item.variant === 'danger'
                  ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                  : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              } ${index !== items.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterDropdown({
  value,
  options,
  onChange,
}: {
  value: 'all' | 'active' | 'inactive';
  options: { value: 'all' | 'active' | 'inactive'; label: string }[];
  onChange: (value: 'all' | 'active' | 'inactive') => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={filterRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-11 min-w-[230px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-900 shadow-sm transition-colors hover:bg-gray-50 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
      >
        <Filter className="h-4 w-4 shrink-0 text-gray-700 dark:text-gray-300" />
        <span className="shrink-0 font-semibold">Filtrer par :</span>
        <span className="min-w-0 flex-1 truncate text-left font-bold">{selectedOption.label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-700 transition-transform dark:text-gray-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-40 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl shadow-blue-950/10 dark:border-gray-700 dark:bg-gray-900">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                  isSelected
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                <span>{option.label}</span>
                {isSelected && <span className="h-2 w-2 rounded-full bg-blue-500" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// AssignedModuleItem
function AssignedModuleItem({
  assignment,
  isExpanded,
  onToggleExpand,
  onToggleModule,
  onAddParameter,
  onEditParameter,
  onDeleteParameter,
  onEditPrice,
  moduleGlobalStatus,
}: {
  assignment: ModuleAssignment;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleModule: (moduleId: number, currentStatus: boolean) => void;
  onAddParameter: (moduleStoreId: number) => void;
  onEditParameter: (moduleStoreId: number, param: ModuleParameter) => void;
  onDeleteParameter: (moduleStoreId: number, paramId: number) => void;
  onEditPrice: (assignment: ModuleAssignment) => void;
  moduleGlobalStatus?: 'active' | 'inactive';
}) {
  const Icon = moduleIconMap[assignment.module.icon || 'BookOpen'] || BookOpen;
  const isGlobalInactive = moduleGlobalStatus === 'inactive';
  const isDisabled = !assignment.actif || isGlobalInactive;

  return (
    <div
      className={`rounded-xl border transition-all ${
        isDisabled
          ? 'border-gray-200 bg-gray-100/80 opacity-60 dark:border-gray-700 dark:bg-gray-800/40'
          : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
      }`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isDisabled ? 'bg-gray-100 dark:bg-gray-800' : 'bg-orange-100 dark:bg-orange-900/30'
            }`}>
              <Icon className={`w-5 h-5 ${isDisabled ? 'text-gray-400 dark:text-gray-500' : 'text-orange-500'}`} />
            </div>
            <div>
              <h5 className={`font-medium ${isDisabled ? 'text-gray-600 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                {assignment.module.label || assignment.module.name}
              </h5>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {assignment.module.category || 'Module'}
              </p>
              <p className={`mt-1 text-xs font-semibold ${
                isDisabled ? 'text-gray-500 dark:text-gray-400' : 'text-orange-600 dark:text-orange-400'
              }`}>
                {formatMonthlyPrice(assignment.price)}
                <button
                  type="button"
                  onClick={() => onEditPrice(assignment)}
                  disabled={isGlobalInactive}
                  className={`ml-2 text-xs font-semibold ${
                    isGlobalInactive
                      ? 'cursor-not-allowed text-gray-400 dark:text-gray-500'
                      : 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
                  }`}
                >
                  Modifier prix
                </button>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             {isGlobalInactive ? (
               <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">
                Global inactif
               </Badge>
              ) : (
            <Badge
              variant={assignment.actif ? 'success' : 'default'}
              className={
                assignment.actif
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }
            >
              {assignment.actif ? 'Actif' : 'Inactif'}
            </Badge>
              )}
            <label className={`relative inline-flex items-center ${
                  isGlobalInactive ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                 }`}>
              <input
                type="checkbox"
                className="sr-only peer"
                checked={assignment.actif && !isGlobalInactive}
                onChange={() => {
                  if (!isGlobalInactive) {
                   onToggleModule(assignment.module.id, assignment.actif);
                   }
                }}
              disabled={isGlobalInactive}
              />
              <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
            <button
              onClick={onToggleExpand}
              className={`p-2 rounded-lg transition-colors ${
                isExpanded
                  ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500'
              }`}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Bloc paramètres — visible uniquement si actif localement ET globalement */}
      {isExpanded && assignment.actif && !isGlobalInactive && (
        <div className="p-4 pt-0 border-t border-gray-200 dark:border-gray-700">
          <div className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" />
                Paramètres du module
              </h6>
              <Button
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-xs py-1 px-2.5 flex items-center gap-1"
                onClick={() => onAddParameter(assignment.id)}
              >
                <Plus className="w-3 h-3" /> Ajouter un paramètre
              </Button>
            </div>
            <div className="space-y-3">
              {assignment.parameters && assignment.parameters.length > 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Paramètre</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Requis</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                      {assignment.parameters.map((param) => (
                        <tr key={param.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{param.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            <Badge variant="secondary" className="text-xs bg-gray-100 dark:bg-gray-800">
                              {param.type === 'string' && 'Texte'}
                              {param.type === 'number' && 'Nombre'}
                              {param.type === 'boolean' && 'Booléen'}
                              {param.type === 'image' && 'Image'}
                              {param.type === 'date' && 'Date'}
                              {param.type === 'select' && 'Sélection'}
                              {!param.type && 'Texte'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {param.required ? (
                              <Badge variant="warning" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Requis</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Optionnel</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => onEditParameter(assignment.id, param)}
                                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                title="Modifier"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onDeleteParameter(assignment.id, param.id)}
                                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <SettingsIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Aucun paramètre configurable pour ce module</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isExpanded && (!assignment.actif || isGlobalInactive) && (
        <div className="p-4 pt-0">
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isGlobalInactive
                ? 'Ce module est désactivé globalement. Réactivez-le dans la section Modules pour le configurer.'
                : 'Ce module est désactivé. Activez-le pour voir ses paramètres.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// StoreCard
function StoreCard({ 
  store, 
  index,
  onConfigure,
  onEdit, 
  onSuspend,
  onDelete
}: { 
  store: StoreUIDto;
  index: number;
  onConfigure: (store: StoreUIDto) => void;
  onEdit: (store: StoreUIDto) => void;
  onSuspend: (store: StoreUIDto) => void;
  onDelete: (store: StoreUIDto) => void;
}) {
  const Icon = store.IconComponent;
  const iconColor = getIconColor(index);
  
  return (
    <Card className={`h-full flex flex-col ${store.status === 'inactive' ? 'opacity-80' : ''}`}>
      <CardHeader className="flex-1">
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${iconColor}20` }}
          >
            <Icon className="w-6 h-6" style={{ color: iconColor }} />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={store.status === 'active' ? 'success' : 'default'}>
              {store.status === 'active' ? 'Actif' : 'Inactif'}
            </Badge>
            <DropdownMenu
              items={[
                { label: 'Modifier', onClick: () => onEdit(store) },
                { label: 'Supprimer', onClick: () => onDelete(store), variant: 'danger' }
              ]}
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </DropdownMenu>
          </div>
        </div>
        <CardTitle className="capitalize">{store.name}</CardTitle>
        <CardDescription>{store.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Modules actifs</div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{store.modules}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Prix du store</div>
          <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">{formatMonthlyPrice(store.price)}</p>
        </div>

        <div className="flex gap-2">
          <Button
            className={`flex-1 rounded-lg border border-gray-300 dark:border-gray-600 !bg-gray-100 dark:!bg-gray-800 !text-gray-600 dark:!text-gray-300 hover:!bg-gray-200 dark:hover:!bg-gray-700 text-sm font-medium shadow-none ${
    store.status !== 'active' ? 'opacity-50 cursor-not-allowed' : ''
  }`}
            icon={<Edit className="w-4 h-4 !text-gray-500" />}
            onClick={() => store.status === 'active' && onConfigure(store)}
            disabled={store.status !== 'active'}
            title={store.status !== 'active' ? "Store inactif - configuration impossible" : ""}
          >
            Configurer
          </Button>

          <Button
            size="sm"
            variant="outline"
            className={`flex-1 ${
              store.status === 'active' 
                ? 'border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                : 'border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
            }`}
            onClick={() => onSuspend(store)}
          >
            {store.status === 'active' ? 'Suspendre' : 'Activer'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ModuleCard
function ModuleCard({ 
  module, 
  index,
  onAssign,
  onEdit,
  onDelete
}: { 
  module: ModuleUIDto;
  index: number;
  onAssign: (module: ModuleDto) => void;
  onEdit: (module: ModuleUIDto) => void;
  onDelete: (module: ModuleUIDto) => void;
}) {
  const Icon = module.IconComponent;
  const iconColor = getIconColor(index);
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${iconColor}20` }}
        >
          <Icon className="w-6 h-6" style={{ color: iconColor }} />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800">
            {module.category || module.label || module.name}
          </Badge>
          <DropdownMenu
            items={[
              { label: 'Modifier', onClick: () => onEdit(module) },
              { label: 'Supprimer', onClick: () => onDelete(module), variant: 'danger' }
            ]}
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </DropdownMenu>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {module.label || module.name}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex-1">
          {module.description || '—'}
        </p>
        <div className="mb-4">
          <Badge 
            variant={module.status === 'active' ? 'success' : 'default'}
            className={module.status === 'active' 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }
          >
            {module.status === 'active' ? 'Global Actif' : 'Global Inactif'}
          </Badge>
        </div>
      </div>

      <Button
        size="sm"
        variant="outline"
        className={`w-full ${
          module.status === 'active'
            ? 'border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
            : 'border-gray-300 text-gray-400 cursor-not-allowed opacity-50'
        }`}
        onClick={() => module.status === 'active' && onAssign(module)}
        disabled={module.status !== 'active'}
        title={module.status !== 'active' ? "Module inactif - impossible d'assigner" : ""}
      >
        Assigner à un Store
      </Button>
    </div>
  );
}


// ============ 5. COMPOSANT PRINCIPAL : SaaSStoresModules ============
export function SaaSStoresModules() {
  //   5.1 — States (groupés par catégorie avec commentaires)
  
  // Creation Store
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreIcon, setNewStoreIcon] = useState('Smartphone');
  const [newStoreDescription, setNewStoreDescription] = useState('');
  const [newStorePrice, setNewStorePrice] = useState('');
  const [newStoreIsActive, setNewStoreIsActive] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Edition Store
  const [editStoreName, setEditStoreName] = useState('');
  const [editStoreIcon, setEditStoreIcon] = useState('Smartphone');
  const [editStoreDescription, setEditStoreDescription] = useState('');
  const [editStorePrice, setEditStorePrice] = useState('');
  const [editStoreIsActive, setEditStoreIsActive] = useState(true);
  const [editStoreLoading, setEditStoreLoading] = useState(false);

  // Creation Module
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleCategory, setNewModuleCategory] = useState('');
  const [newModuleDescription, setNewModuleDescription] = useState('');
  const [newModuleIcon, setNewModuleIcon] = useState('Calculator');
  const [newModuleIsActive, setNewModuleIsActive] = useState(true);
  const [isCreatingModule, setIsCreatingModule] = useState(false);

  // Edition Module
  const [editModuleName, setEditModuleName] = useState('');
  const [editModuleCategory, setEditModuleCategory] = useState('');
  const [editModuleDescription, setEditModuleDescription] = useState('');
  const [editModuleIcon, setEditModuleIcon] = useState('Calculator');
  const [editModuleIsActive, setEditModuleIsActive] = useState(true);
  const [editModuleLoading, setEditModuleLoading] = useState(false);

  // UI / Navigation
  const [activeTab, setActiveTab] = useState('stores');
  const [storeStatusFilter, setStoreStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [moduleStatusFilter, setModuleStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showDrawer, setShowDrawer] = useState(false);
  const [expandedModuleId, setExpandedModuleId] = useState<number | null>(null);
  const [togglingModuleId, setTogglingModuleId] = useState<number | null>(null);
  void togglingModuleId;

  // Data
  const [stores, setStores] = useState<StoreUIDto[]>([]);
  const [modulesList, setModulesList] = useState<ModuleUIDto[]>([]);
  const [assignedModules, setAssignedModules] = useState<ModuleAssignment[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreUIDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isLoadingModules, setIsLoadingModules] = useState(false);

  // Modals
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [storeToSuspend, setStoreToSuspend] = useState<StoreUIDto | null>(null);
  const [showDeleteStoreModal, setShowDeleteStoreModal] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<StoreUIDto | null>(null);
  const [showEditStoreModal, setShowEditStoreModal] = useState(false);
  const [storeToEdit, setStoreToEdit] = useState<StoreUIDto | null>(null);
  const [showDeleteModuleModal, setShowDeleteModuleModal] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<ModuleUIDto | null>(null);
  const [showEditModuleModal, setShowEditModuleModal] = useState(false);
  const [moduleToEdit, setModuleToEdit] = useState<ModuleUIDto | null>(null);
  const [showEditModuleStorePriceModal, setShowEditModuleStorePriceModal] = useState(false);
  const [moduleStoreToEditPrice, setModuleStoreToEditPrice] = useState<ModuleAssignment | null>(null);
  const [editModuleStorePrice, setEditModuleStorePrice] = useState('');
  const [editModuleStorePriceLoading, setEditModuleStorePriceLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showCreateStoreModal, setShowCreateStoreModal] = useState(false);
  const [showCreateModuleModal, setShowCreateModuleModal] = useState(false);

  // Assign Module
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [moduleToAssign, setModuleToAssign] = useState<ModuleDto | null>(null);
  const [assignTargetStore, setAssignTargetStore] = useState<StoreUIDto | null>(null);
  const [assignmentPrice, setAssignmentPrice] = useState('');
  const [currentParameters, setCurrentParameters] = useState<LocalModuleParameter[]>([]);
  const [currentParameterForm, setCurrentParameterForm] = useState<LocalModuleParameter>({
    name: '',
    code: '',
    type: 'string',
    required: false,
  });
  const [showParameterForm, setShowParameterForm] = useState(false);
  const [isAssigningModule, setIsAssigningModule] = useState(false);
  const [isAlreadyAssigned, setIsAlreadyAssigned] = useState(false);

  // Param Management
  const [showParamManageModal, setShowParamManageModal] = useState(false);
  const [paramManageMode, setParamManageMode] = useState<'create' | 'edit'>('create');
  const [paramTargetModuleStoreId, setParamTargetModuleStoreId] = useState<number | null>(null);
  const [paramTargetParameterId, setParamTargetParameterId] = useState<number | null>(null);
  const [paramForm, setParamForm] = useState<{
    name: string;
    code: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'select' | 'image';
    required: boolean;
  }>({
    name: '',
    code: '',
    type: 'string',
    required: false,
  });
  const [saveParamLoading, setSaveParamLoading] = useState(false);

  const filteredStores = stores.filter((store) =>
    storeStatusFilter === 'all' ? true : store.status === storeStatusFilter
  );

  const filteredModules = modulesList.filter((module) =>
    moduleStatusFilter === 'all' ? true : module.status === moduleStatusFilter
  );

  const isAssignmentModuleGloballyInactive = (assignment: ModuleAssignment) => {
    const globalModule = modulesList.find((module) => module.id === assignment.module.id);
    return (globalModule?.status ?? assignment.module.status) === 'inactive';
  };


  //   5.2 — useEffect
  useEffect(() => {
    fetchStores();
    loadModules();
  }, []);

  // Recalcule pour tous les stores quand modulesList change
  useEffect(() => {
    if (modulesList.length === 0 || !selectedStore || assignedModules.length === 0) return;

    // Recalcule le compteur du store actuellement ouvert dans le drawer
    const activeCount = assignedModules.filter(a => {
      const globalModule = modulesList.find(m => m.id === a.module.id);
      return a.actif && globalModule?.status !== 'inactive';
    }).length;

    setStores(prev =>
      prev.map(store =>
        store.id === selectedStore.id
          ? { ...store, modules: activeCount }
          : store
      )
    );
  }, [modulesList, assignedModules, selectedStore]);


  //   5.3 — Fonctions (groupées avec commentaires)

  // Fetch & Load
  const fetchStores = async () => {
    setLoading(true);
    try {
      const response = await storeService.getAllStores();
      const storesWithUI: StoreUIDto[] = response.data.map((store: any) => ({
        ...store,
        IconComponent: storeIconMap[store.icon] || storeIconMap['Car'],
        iconName: store.icon,
        modules: store.modulesCount || 0,
      }));
      setStores(storesWithUI);
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadModules = async () => {
    try {
      setIsLoading(true);
      const response = await moduleService.getAllModules();
      const modulesWithUI: ModuleUIDto[] = response.data.map((module: any) => ({
        ...module,
        IconComponent: module.icon && moduleIconMap[module.icon] 
          ? moduleIconMap[module.icon] 
          : moduleIconMap['BookOpen'],
        iconName: module.icon || 'BookOpen'
      }));
      setModulesList(modulesWithUI);
    } catch (error) {
      console.error('Erreur lors de la récupération des modules:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssignedModulesForStore = async (storeId: number) => {
    setIsLoadingModules(true);
    try {
      const response = await moduleService.getStoreModulesWithConfig(storeId);
      const data = response.data || [];
      setAssignedModules(data);
      const activeCount = data.filter((a: ModuleAssignment) => {
        const globalModule = modulesList.find(m => m.id === a.module.id);
        return a.actif && globalModule?.status !== 'inactive';
      }).length;

      setStores(prev =>
        prev.map(s => s.id === storeId ? { ...s, modules: activeCount } : s)
      );
      return data;
    } catch (error) {
      console.error('Erreur lors du chargement des modules assignés:', error);
      setAssignedModules([]);
      return [];
    } finally {
      setIsLoadingModules(false);
    }
  };

  // Store handlers
  const handleCreateStore = async () => {
    if (!newStoreName.trim()) {
      alert('Le nom du store est requis');
      return;
    }
    const parsedPrice = parseRequiredPrice(newStorePrice);
    if (parsedPrice === null) {
      alert('Le prix du store est requis et doit être supérieur ou égal à 0.');
      return;
    }
    setIsCreating(true);
    const payload: any = {
      name: newStoreName.toLowerCase(),
      icon: newStoreIcon,
      description: newStoreDescription,
      price: parsedPrice,
      status: newStoreIsActive ? 'active' as const : 'inactive' as const,
    };
    try {
      const response = await storeService.createStore(payload);
      const newStoreWithUI: StoreUIDto = {
        ...response.data,
        IconComponent: storeIconMap[response.data.icon] || storeIconMap['Car'],
        iconName: response.data.icon,
        modules: 0,
      };
      setStores([...stores, newStoreWithUI]);
    } catch (error) {
      console.error('Failed to create store:', error);
    } finally {
      setNewStoreName('');
      setNewStoreIcon('Smartphone');
      setNewStoreDescription('');
      setNewStorePrice('');
      setNewStoreIsActive(true);
      setShowCreateStoreModal(false);
      setIsCreating(false);
    }
  };

  const handleConfigureStore = async (store: StoreUIDto) => {
    setSelectedStore(store);
    await loadAssignedModulesForStore(store.id);
    setShowDrawer(true);
  };

  const handleOpenEditStoreModal = (store: StoreUIDto) => {
    setStoreToEdit(store);
    setEditStoreName(store.name);
    setEditStoreIcon(store.iconName);
    setEditStoreDescription(store.description);
    setEditStorePrice(store.price?.toString() || '');
    setEditStoreIsActive(store.status === 'active');
    setShowEditStoreModal(true);
  };

  const confirmEditStore = async () => {
    if (!storeToEdit || !editStoreName.trim()) {
      alert('Le nom du store est requis');
      return;
    }
    const parsedPrice = parseRequiredPrice(editStorePrice);
    if (parsedPrice === null) {
      alert('Le prix du store est requis et doit être supérieur ou égal à 0.');
      return;
    }
    setEditStoreLoading(true);
    try {
      const status = editStoreIsActive ? 'active' as const : 'inactive' as const;
      const payload = {
        name: editStoreName.toLowerCase(),
        icon: editStoreIcon,
        description: editStoreDescription,
        price: parsedPrice,
        status,
      };

      await storeService.updateStore(storeToEdit.id, payload);

      setStores((prev) =>
        prev.map((s) =>
          s.id === storeToEdit.id
            ? {
                ...s,
                name: editStoreName.toLowerCase(),
                description: editStoreDescription,
                price: parsedPrice,
                status: editStoreIsActive ? 'active' : 'inactive',
                iconName: editStoreIcon,
                IconComponent: storeIconMap[editStoreIcon] || storeIconMap['Car'],
              }
            : s
        )
      );

      setShowEditStoreModal(false);
      setStoreToEdit(null);
    } catch (error) {
      console.error('Erreur lors de la modification du store:', error);
      alert('Erreur lors de la modification du store');
    } finally {
      setEditStoreLoading(false);
    }
  };

  const handleSuspendStore = (store: StoreUIDto) => {
    setStoreToSuspend(store);
    setShowSuspendModal(true);
  };

  const confirmSuspend = async () => {
    if (!storeToSuspend || !storeToSuspend.id) return;
    setSuspendLoading(true);
    const newStatus = storeToSuspend.status === 'active' ? 'inactive' : 'active';
    try {
      setStores((prev) =>
        prev.map((s) =>
          s.id === storeToSuspend.id ? { ...s, status: newStatus } : s
        )
      );
      if (selectedStore?.id === storeToSuspend.id) {
        setSelectedStore((prev) => (prev ? { ...prev, status: newStatus } : prev));
      }
      const { IconComponent, modules, iconName, ...storePayload } = storeToSuspend;
      await storeService.updateStore(storeToSuspend.id, {
        ...storePayload,
        icon: iconName,
        status: newStatus,
      });
    } catch (error) {
      console.error('Failed to update store status:', error);
    } finally {
      setSuspendLoading(false);
      setShowSuspendModal(false);
      setStoreToSuspend(null);
    }
  };

  const handleDeleteStore = (store: StoreUIDto) => {
    setStoreToDelete(store);
    setShowDeleteStoreModal(true);
  };

  const confirmDeleteStore = async () => {
    if (!storeToDelete || !storeToDelete.id) return;
    setDeleteLoading(true);
    try {
      await storeService.deleteStore(storeToDelete.id);
      setStores((prev) => prev.filter((s) => s.id !== storeToDelete.id));
      if (selectedStore?.id === storeToDelete.id) {
        setSelectedStore(null);
        setShowDrawer(false);
      }
      setShowDeleteStoreModal(false);
      setStoreToDelete(null);
    } catch (error) {
      console.error('Failed to delete store:', error);
      alert('Erreur lors de la suppression du store');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Module handlers
  const handleCreateModule = async () => {
    if (!newModuleName.trim()) {
      alert('Le nom du module est requis');
      return;
    }
    setIsCreatingModule(true);
    try {
      const payload = {
        name: newModuleName.toLowerCase(),
        label: newModuleName,
        category: newModuleCategory || null,
        description: newModuleDescription,
        icon: newModuleIcon,
        status: newModuleIsActive ? 'active' as const : 'inactive' as const,
      };
      
      const response = await moduleService.createModule(payload);
      
      const newModuleWithUI: ModuleUIDto = {
        ...response.data,
        IconComponent: response.data.icon ? moduleIconMap[response.data.icon] : moduleIconMap['BookOpen'],
        iconName: response.data.icon || 'BookOpen'
      };

      setModulesList((prev) => [...prev, newModuleWithUI]);

      setNewModuleName('');
      setNewModuleCategory('');
      setNewModuleDescription('');
      setNewModuleIcon('Calculator');
      setNewModuleIsActive(true);
      setShowCreateModuleModal(false);
    } catch (error) {
      console.error('Erreur lors de la création du module:', error);
      alert('Erreur lors de la création du module');
    } finally {
      setIsCreatingModule(false);
    }
  };

  const handleEditModule = (module: ModuleUIDto) => {
    setModuleToEdit(module);
    setEditModuleName(module.label || module.name);
    setEditModuleCategory(module.category || '');
    setEditModuleDescription(module.description || '');
    setEditModuleIcon(module.iconName || 'Calculator');
    setEditModuleIsActive(module.status === 'active');
    setShowEditModuleModal(true);
  };

  const confirmEditModule = async () => {
    if (!moduleToEdit || !editModuleName.trim()) {
      alert('Le nom du module est requis');
      return;
    }
    setEditModuleLoading(true);
    try {
      const payload = {
        name: editModuleName.toLowerCase(),
        label: editModuleName,
        category: editModuleCategory || null,
        description: editModuleDescription,
        icon: editModuleIcon,
        status: editModuleIsActive ? 'active' as const : 'inactive' as const,
      };

      await moduleService.updateModule(moduleToEdit.id, payload);

      const updatedModulesList = modulesList.map(m =>
        m.id === moduleToEdit.id
          ? {
              ...m,
              label: editModuleName,
              name: editModuleName.toLowerCase(),
              category: editModuleCategory || '',
              description: editModuleDescription,
              icon: editModuleIcon,
              status: editModuleIsActive ? 'active' as const : 'inactive' as const,
              iconName: editModuleIcon,
              IconComponent: editModuleIcon && moduleIconMap[editModuleIcon]
                ? moduleIconMap[editModuleIcon]
                : moduleIconMap['BookOpen'],
            }
          : m
      );

      setModulesList(updatedModulesList as ModuleUIDto[]);

      if (selectedStore && assignedModules.length > 0) {
        const activeCount = assignedModules.filter(a => {
          const globalModule = updatedModulesList.find(m => m.id === a.module.id);
          return a.actif && globalModule?.status !== 'inactive';
        }).length;

        setStores(prev =>
          prev.map(s =>
            s.id === selectedStore.id
              ? { ...s, modules: activeCount }
              : s
          )
        );
      }

      await fetchStores();

      setShowEditModuleModal(false);
      setModuleToEdit(null);
    } catch (error) {
      console.error('Erreur lors de la modification du module:', error);
      alert('Erreur lors de la modification du module');
    } finally {
      setEditModuleLoading(false);
    }
  };

  const handleDeleteModule = (module: ModuleUIDto) => {
    setModuleToDelete(module);
    setShowDeleteModuleModal(true);
  };

  const confirmDeleteModule = async () => {
    if (!moduleToDelete || !moduleToDelete.id) return;
    setDeleteLoading(true);
    try {
      await moduleService.deleteModule(moduleToDelete.id);
      setModulesList((prev) => prev.filter((m) => m.id !== moduleToDelete.id));
      setShowDeleteModuleModal(false);
      setModuleToDelete(null);
    } catch (error) {
      console.error('Failed to delete module:', error);
      alert('Erreur lors de la suppression du module');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Assign handlers
  const handleAssignModule = (module: ModuleDto) => {
    setModuleToAssign(module);
    setShowAssignModal(true);
    resetAssignState();
  };

  const resetAssignState = () => {
    setAssignTargetStore(null);
    setCurrentParameters([]);
    setCurrentParameterForm({
      
      name: '',
      code: '',
      type: 'string',
      required: false,
    });
    setAssignmentPrice('');
    setShowParameterForm(false);
    setIsAssigningModule(false);
    setIsAlreadyAssigned(false);
  };

  const handleSelectTargetStore = async (store: StoreUIDto) => {
    setAssignTargetStore(store);
    setCurrentParameters([]);
    setAssignmentPrice('');
    setCurrentParameterForm({
      name: '',
      code: '',
      type: 'string',
      required: false,
    });
    setShowParameterForm(false);
    setIsAlreadyAssigned(false);
    
    const assigned = await loadAssignedModulesForStore(store.id);
    if (moduleToAssign) {
      const exists = assigned.some((assignment) => assignment.module.id === moduleToAssign.id);
      if (exists) {
        setIsAlreadyAssigned(true);
        alert("Ce module est déjà assigné à ce store.");
      }
    }
  };

  const confirmAssignModule = async (storeId: number) => {
    if (!moduleToAssign || !assignTargetStore) return;

    const exists = assignedModules.some((assignment) => assignment.module.id === moduleToAssign.id);
    if (exists) {
      alert("Ce module est déjà assigné à ce store.");
      return;
    }

    if (currentParameters.length === 0) {
      alert('Ajoutez au moins un paramètre avant de confirmer l\'assignation.');
      return;
    }
    const parsedAssignmentPrice = parseRequiredPrice(assignmentPrice);
    if (parsedAssignmentPrice === null) {
      alert('Le prix du module est requis et doit être supérieur ou égal à 0.');
      return;
    }

    setIsAssigningModule(true);
    try {
      await moduleService.assignModuleToStoreFull({
        store: { id: storeId },
        module: { id: moduleToAssign.id },
        actif: true,
        ordre: assignTargetStore.modules + 1,
        price: parsedAssignmentPrice,
        parameters: currentParameters.map((param) => ({
          name: param.name,
          code: param.code || param.name,
          type: param.type,
          required: param.required,
        })),
      });

      setStores((prev) =>
        prev.map((s) =>
          s.id === storeId ? { ...s, modules: s.modules + 1 } : s
        )
      );
      if (selectedStore?.id === storeId) {
        await loadAssignedModulesForStore(storeId);
      }
      setShowAssignModal(false);
      setModuleToAssign(null);
      resetAssignState();
    } catch (error) {
      console.error('Failed to assign module:', error);
      alert('Erreur lors de l\'assignation du module');
    } finally {
      setIsAssigningModule(false);
    }
  };

  const handleOpenEditModuleStorePriceModal = (assignment: ModuleAssignment) => {
    if (isAssignmentModuleGloballyInactive(assignment)) {
      return;
    }

    setModuleStoreToEditPrice(assignment);
    setEditModuleStorePrice(assignment.price?.toString() || '');
    setShowEditModuleStorePriceModal(true);
  };

  const confirmEditModuleStorePrice = async () => {
    if (!moduleStoreToEditPrice) return;
    if (isAssignmentModuleGloballyInactive(moduleStoreToEditPrice)) {
      return;
    }

    const parsedPrice = parseRequiredPrice(editModuleStorePrice);
    if (parsedPrice === null) {
      alert('Le prix du module est requis et doit être supérieur ou égal à 0.');
      return;
    }

    setEditModuleStorePriceLoading(true);
    try {
      const response = await moduleService.updateModuleStorePrice(moduleStoreToEditPrice.id, parsedPrice);
      setAssignedModules((prev) =>
        prev.map((assignment) =>
          assignment.id === moduleStoreToEditPrice.id
            ? { ...assignment, price: response.data.price ?? parsedPrice }
            : assignment
        )
      );
      setShowEditModuleStorePriceModal(false);
      setModuleStoreToEditPrice(null);
      setEditModuleStorePrice('');
    } catch (error) {
      console.error('Failed to update module store price:', error);
      alert('Erreur lors de la modification du prix du module.');
    } finally {
      setEditModuleStorePriceLoading(false);
    }
  };

  const handleToggleModule = async (storeId: number, moduleId: number, currentStatus: boolean) => {
    setTogglingModuleId(moduleId);
    try {
      await moduleService.toggleModuleForStore(storeId, moduleId, !currentStatus);
      
      setAssignedModules(prev => {
        const updated = prev.map(item =>
          item.module.id === moduleId
            ? { ...item, actif: !currentStatus }
            : item
        );
        
        const activeCount = updated.filter(item => {
          const globalModule = modulesList.find(m => m.id === item.module.id);
          return item.actif && globalModule?.status !== 'inactive';
        }).length;
        
        setStores(prevStores =>
          prevStores.map(s =>
            s.id === storeId ? { ...s, modules: activeCount } : s
          )
        );
        
        return updated;
      });
      
      if (currentStatus) {
        setExpandedModuleId(null);
      }
    } finally {
      setTogglingModuleId(null);
    }
  };

  const toggleExpand = (moduleId: number) => {
    setExpandedModuleId(expandedModuleId === moduleId ? null : moduleId);
  };

  // Parameter handlers
  const handleAddParameter = () => {
    setShowParameterForm(true);
    setCurrentParameterForm({
    
      name: '',
      code: '',
      type: 'string',
      required: false,
    });
  };

  const handleConfirmParameter = () => {
    if (!currentParameterForm.name.trim() || !currentParameterForm.code.trim()) {
      alert('Le nom et le code du paramètre sont requis.');
      return;
    }

    setCurrentParameters((prev) => [
      ...prev,
      {
        ...currentParameterForm,
        code: currentParameterForm.code.trim(),
      },
    ]);
    setCurrentParameterForm({
    
      name: '',
      code: '',
      type: 'string',
      required: false,
    });
    setShowParameterForm(false);
  };

  const handleDeleteParameter = (index: number) => {
    setCurrentParameters((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleOpenAddParamModal = (moduleStoreId: number) => {
    setParamManageMode('create');
    setParamTargetModuleStoreId(moduleStoreId);
    setParamForm({
      name: '',
      code: '',
      type: 'string',
      required: false,
    });
    setShowParamManageModal(true);
  };

  const handleOpenEditParamModal = (moduleStoreId: number, param: ModuleParameter) => {
    setParamManageMode('edit');
    setParamTargetModuleStoreId(moduleStoreId);
    setParamTargetParameterId(param.id);
    setParamForm({
      name: param.name,
      code: param.code,
      type: param.type || 'string',
      required: param.required,
    });
    setShowParamManageModal(true);
  };

  const handleDeleteParam = async (moduleStoreId: number, paramId: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce paramètre ?")) return;
    try {
      const response = await moduleService.deleteModuleStoreParameter(paramId);
      setAssignedModules((prev) =>
        prev.map((item) => {
          if (item.id === moduleStoreId) {
            return {
              ...item,
              parameters: response.data.parameters || []
            };
          }
          return item;
        })
      );
    } catch (error) {
      console.error("Failed to delete parameter:", error);
      alert("Erreur lors de la suppression du paramètre");
    }
  };

  const handleSaveParam = async () => {
    if (!paramForm.name.trim() || !paramForm.code.trim()) {
      alert("Le nom et le code sont obligatoires.");
      return;
    }
    setSaveParamLoading(true);
    try {
      if (paramManageMode === 'create') {
        if (!paramTargetModuleStoreId) return;
        const response = await moduleService.addParameterToModuleStore(paramTargetModuleStoreId, paramForm);
        setAssignedModules((prev) =>
          prev.map((item) => {
            if (item.id === paramTargetModuleStoreId) {
              return {
                ...item,
                parameters: response.data.parameters || []
              };
            }
            return item;
          })
        );
      } else {
        if (!paramTargetParameterId || !paramTargetModuleStoreId) return;
        const response = await moduleService.updateModuleStoreParameter(paramTargetParameterId, paramForm);
        setAssignedModules((prev) =>
          prev.map((item) => {
            if (item.id === paramTargetModuleStoreId) {
              return {
                ...item,
                parameters: response.data.parameters || []
              };
            }
            return item;
          })
        );
      }
      setShowParamManageModal(false);
    } catch (error) {
      console.error("Failed to save parameter:", error);
      alert("Erreur lors de l'enregistrement du paramètre");
    } finally {
      setSaveParamLoading(false);
    }
  };


  //   5.4 — return JSX
  return (
    <div className="space-y-6">
      {/* Tabs header */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Stores et Modules</h2>
        </div>
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('stores')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'stores'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Stores
          </button>
          <button
            onClick={() => setActiveTab('modules')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'modules'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Modules
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && activeTab === 'stores' && (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
        </div>
      )}

      {/* Stores tab */}
      {!loading && activeTab === 'stores' && (
        <>
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-lg text-gray-500 dark:text-gray-400">
                Gerez les stores disponibles sur la plateforme
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <FilterDropdown
                value={storeStatusFilter}
                onChange={setStoreStatusFilter}
                options={[
                  { value: 'all', label: 'Tous les stores' },
                  { value: 'active', label: 'Actifs' },
                  { value: 'inactive', label: 'Inactifs' },
                ]}
              />
              <Button onClick={() => setShowCreateStoreModal(true)} 
               className="bg-primary hover:bg-primary-hover border-none text-white rounded-xl shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Creer un Store
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {filteredStores.map((store, index) => (
              <StoreCard
                key={store.id}
                store={store}
                index={index}
                onConfigure={handleConfigureStore}
                onEdit={handleOpenEditStoreModal}
                onSuspend={handleSuspendStore}
                onDelete={handleDeleteStore}
              />
            ))}
            {filteredStores.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-500 dark:text-gray-400">
                Aucun store ne correspond a ce filtre.
              </div>
            )}
          </div>
        </>
      )}

      {/* Modules tab */}
      {activeTab === 'modules' && (
        <>
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-lg text-gray-500 dark:text-gray-400">
                Gerez les modules disponibles sur la plateforme
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <FilterDropdown
                value={moduleStatusFilter}
                onChange={setModuleStatusFilter}
                options={[
                  { value: 'all', label: 'Tous les modules' },
                  { value: 'active', label: 'Actifs' },
                  { value: 'inactive', label: 'Inactifs' },
                ]}
              />
              <Button onClick={() => setShowCreateModuleModal(true)} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4" />
                Creer un Module
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {filteredModules.map((module, index) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  index={index}
                  onAssign={handleAssignModule}
                  onEdit={handleEditModule}
                  onDelete={handleDeleteModule}
                />
              ))}

              {filteredModules.length === 0 && (
                <div className="col-span-3 text-center py-12 text-gray-500 dark:text-gray-400">
                  Aucun module ne correspond a ce filtre.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Drawer */}
      {showDrawer && selectedStore && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setShowDrawer(false);
              setExpandedModuleId(null);
            }}
          />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[90vh] w-full max-w-4xl bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto rounded-xl">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  {selectedStore.IconComponent && <selectedStore.IconComponent className="w-5 h-5 text-orange-500" />}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Configuration {selectedStore.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Activez/Desactivez les modules et consultez leurs parametres
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowDrawer(false);
                  setExpandedModuleId(null);
                }} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                    Modules assignes
                  </h4>
                  <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800">
                    {assignedModules.filter(a => {
                      const globalModule = modulesList.find(m => m.id === a.module.id);
                      return a.actif && globalModule?.status !== 'inactive';
                     }).length} module(s)
                  </Badge>
                </div>

                {isLoadingModules ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
                  </div>
                ) : assignedModules.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <p className="text-gray-500 dark:text-gray-400">
                      Aucun module assigne a ce store
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4 border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                      onClick={() => {
                        setShowDrawer(false);
                        setActiveTab('modules');
                      }}
                    >
                      Ajouter des modules
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignedModules.map((assignment) => {
                      const globalModule = modulesList.find(m => m.id === assignment.module.id);
                      return (
                      <AssignedModuleItem
                        key={assignment.module.id}
                        assignment={assignment}
                        isExpanded={expandedModuleId === assignment.module.id}
                        onToggleExpand={() => toggleExpand(assignment.module.id)}
                        onToggleModule={(moduleId, currentStatus) => 
                          handleToggleModule(selectedStore.id, moduleId, currentStatus)
                        }
                        onAddParameter={(moduleStoreId) => handleOpenAddParamModal(moduleStoreId)}
                        onEditParameter={(moduleStoreId, param) => handleOpenEditParamModal(moduleStoreId, param)}
                        onDeleteParameter={(moduleStoreId, paramId) => handleDeleteParam(moduleStoreId, paramId)}
                        onEditPrice={handleOpenEditModuleStorePriceModal}
                        moduleGlobalStatus={globalModule?.status}
                      />
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDrawer(false);
                    setExpandedModuleId(null);
                  }}
                >
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*   5.5 — Modals (dans l'ordre) */}

      {/* Suspend Store */}
      <Modal
        isOpen={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        title={storeToSuspend?.status === 'active' ? 'Suspendre le Store' : 'Activer le Store'}
      >
        <div className="space-y-4">
          {storeToSuspend?.status === 'active' ? (
            <>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">Attention</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    La suspension du store <strong>{storeToSuspend?.name}</strong> desactivera
                    tous ses modules et empechera les utilisateurs d'y acceder.
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Les donnees du store seront conservees et vous pourrez le reactiver a tout moment.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-900 dark:text-white">
                Voulez-vous activer le store <strong>{storeToSuspend?.name}</strong> ?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                L'activation permettra aux utilisateurs d'acceder au store et a ses modules.
              </p>
            </>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowSuspendModal(false)} disabled={suspendLoading}>
              Annuler
            </Button>
            <Button
              variant={storeToSuspend?.status === 'active' ? 'danger' : 'primary'}
              onClick={confirmSuspend}
              disabled={suspendLoading}
              className={storeToSuspend?.status === 'active' ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'}
            >
              {suspendLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  En cours...
                </>
              ) : storeToSuspend?.status === 'active' ? (
                'Confirmer la Suspension'
              ) : (
                "Confirmer l'Activation"
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Module */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          resetAssignState();
        }}
        title={`Assigner ${moduleToAssign?.name} a un Store`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Selectionnez un store, puis configurez les parametres pour l'assignation du module{' '}
            <strong>{moduleToAssign?.name}</strong>.
          </p>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {stores.map((store) => {
              const Icon = store.IconComponent;
              const isSelected = assignTargetStore?.id === store.id;
              return (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => handleSelectTargetStore(store)}
                  className={`w-full p-4 rounded-lg transition-colors flex items-center gap-4 text-left ${
                    isSelected
                      ? 'bg-orange-50 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700'
                      : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  disabled={store.status === 'inactive'}
                >
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{store.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {store.modules} modules actifs
                    </p>
                  </div>
                  <Badge variant={store.status === 'active' ? 'success' : 'default'}>
                    {store.status === 'active' ? 'Actif' : 'Inactif'}
                  </Badge>
                </button>
              );
            })}
          </div>

          {assignTargetStore && isAlreadyAssigned && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">Deja assigne</p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Le module <strong>{moduleToAssign?.label || moduleToAssign?.name}</strong> est deja assigne au store <strong>{assignTargetStore.name}</strong>.
                </p>
              </div>
            </div>
          )}

          {assignTargetStore && !isAlreadyAssigned && (
            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Store selectionne</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{assignTargetStore.name}</p>
                </div>
                <Badge variant={assignTargetStore.status === 'active' ? 'success' : 'default'}>
                  {assignTargetStore.status === 'active' ? 'Actif' : 'Inactif'}
                </Badge>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">Prix du module (DT / mois)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={assignmentPrice}
                  onChange={(e) => setAssignmentPrice(e.target.value)}
                  placeholder="Ex: 50"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={handleAddParameter}
                >
                  Ajouter un parametre
                </Button>
                {currentParameters.length > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {currentParameters.length} parametre(s) configure(s)
                  </p>
                )}
              </div>
            </div>
          )}

          {showParameterForm && assignTargetStore && !isAlreadyAssigned && (
            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <div className="mb-4">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">Ajouter un parametre</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Remplissez les informations du parametre a envoyer au store.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <span>Nom</span>
                  <input
                    type="text"
                    value={currentParameterForm.name}
                    onChange={(e) => setCurrentParameterForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Ex: Taux, Duree..."
                  />
                </label>

                

                <label className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <span>Code</span>
                  <input
                    type="text"
                    value={currentParameterForm.code}
                    onChange={(e) => setCurrentParameterForm((prev) => ({ ...prev, code: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Ex: rate"
                  />
                </label>

                <label className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <span>Type</span>
                  <select
                    value={currentParameterForm.type}
                    onChange={(e) => setCurrentParameterForm((prev) => ({ ...prev, type: e.target.value as LocalModuleParameter['type'] }))}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="string">Texte</option>
                    <option value="number">Nombre</option>
                    <option value="boolean">Booleen</option>
                    <option value="date">Date</option>
                    <option value="select">Selection</option>
                  </select>
                </label>

                <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={currentParameterForm.required}
                      onChange={(e) => setCurrentParameterForm((prev) => ({ ...prev, required: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    Requis
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => { setShowParameterForm(false); setCurrentParameterForm({ name: '', code: '', type: 'string', required: false }); }}>Annuler</Button>
                <Button onClick={handleConfirmParameter} disabled={!currentParameterForm.name.trim() || !currentParameterForm.code.trim()} className="bg-orange-500 hover:bg-orange-600">Confirmer parametre</Button>
              </div>
            </div>
          )}

          {currentParameters.length > 0 && !isAlreadyAssigned && (
            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">Parametres ajoutes</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nom</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Requis</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {currentParameters.map((param, index) => (
                      <tr key={`${param.code}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{param.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{param.code}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant="secondary" className="text-xs bg-gray-100 dark:bg-gray-800">
                            {param.type === 'string' && 'Texte'}
                            {param.type === 'number' && 'Nombre'}
                            {param.type === 'boolean' && 'Booleen'}
                            {param.type === 'date' && 'Date'}
                            {param.type === 'select' && 'Selection'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {param.required ? <Badge variant="warning" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Requis</Badge> : <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Optionnel</Badge>}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <Button variant="outline" size="sm" onClick={() => handleDeleteParameter(index)} className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">Supprimer</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => { setShowAssignModal(false); resetAssignState(); }}>Annuler</Button>
            {assignTargetStore && currentParameters.length > 0 && !isAlreadyAssigned && (
              <Button onClick={() => confirmAssignModule(assignTargetStore.id)} className="bg-orange-500 hover:bg-orange-600" disabled={isAssigningModule}>
                {isAssigningModule ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirmer l'assignation</> : "Confirmer l'assignation"}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Create Store */}
      <Modal isOpen={showCreateStoreModal} onClose={() => setShowCreateStoreModal(false)} title="Creer un Store">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">Nom du Store</label>
            <input type="text" value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} placeholder="Ex: Education, Voyage, etc." className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">Icone</label>
            <select value={newStoreIcon} onChange={(e) => setNewStoreIcon(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option value="Smartphone">📱 Smartphone</option>
              <option value="Home">🏠 Home</option>
              <option value="Car">🚗 Car</option>
              <option value="HeartPulse">⚕️ HeartPulse</option>
              <option value="Education">🎓 Education</option>
              <option value="Travel">✈️ Travel</option>
              <option value="Shopping">🛒 Shopping</option>
              <option value="Business">💼 Business</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">Description</label>
            <textarea rows={3} value={newStoreDescription} onChange={(e) => setNewStoreDescription(e.target.value)} placeholder="Description du store..." className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">Prix du store (DT / mois)</label>
            <input type="number" min="0" step="0.01" value={newStorePrice} onChange={(e) => setNewStorePrice(e.target.value)} placeholder="Ex: 120" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={newStoreIsActive} onChange={(e) => setNewStoreIsActive(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Activer immediatement</span>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCreateStoreModal(false)} disabled={isCreating}>Annuler</Button>
            <Button onClick={handleCreateStore} disabled={isCreating || !newStoreName.trim()} className="bg-orange-500 hover:bg-orange-600">{isCreating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> En cours...</> : 'Creer le store'}</Button>
          </div>
        </div>
      </Modal>

      {/* Create Module */}
      <Modal isOpen={showCreateModuleModal} onClose={() => { setShowCreateModuleModal(false); setNewModuleName(''); setNewModuleCategory(''); setNewModuleDescription(''); setNewModuleIcon('Calculator'); setNewModuleIsActive(true); }} title="Creer un Module">
        <div className="space-y-4">
          <div>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">Nom du Module</label>
              <input type="text" placeholder="Ex: Simulateur, Comparateur, etc." value={newModuleName} onChange={(e) => setNewModuleName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">Categorie</label>
              <input type="text" placeholder="Ex: Calcul, Analyse, Contenu, etc." value={newModuleCategory} onChange={(e) => setNewModuleCategory(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">Description</label>
              <textarea rows={3} placeholder="Ex: Module de simulation de credit..." value={newModuleDescription} onChange={(e) => setNewModuleDescription(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">Icone</label>
              <select value={newModuleIcon} onChange={(e) => setNewModuleIcon(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="Calculator">🧮 Calculatrice (Simulateur)</option>
                <option value="GitCompare">🔀 Comparateur</option>
                <option value="BookOpen">📖 Blog / Contenu</option>
                <option value="Bot">🤖 Bot / IA</option>
                <option value="ImageIcon">🖼️ Banniere / Image</option>
                <option value="BarChart">📊 Graphique / Analyse</option>
                <option value="Bell">🔔 Notification</option>
                <option value="Shield">🛡️ Securite</option>
                <option value="Mail">✉️ Email</option>
                <option value="Settings">⚙️ Parametres</option>
                <option value="Users">👥 Utilisateurs</option>
                <option value="Globe">🌐 Web</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={newModuleIsActive} onChange={(e) => setNewModuleIsActive(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Activer immediatement</span>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => { setShowCreateModuleModal(false); setNewModuleName(''); setNewModuleCategory(''); setNewModuleDescription(''); setNewModuleIcon('Calculator'); setNewModuleIsActive(true); }}>Annuler</Button>
            <Button onClick={handleCreateModule} disabled={isCreatingModule || !newModuleName.trim()} className="bg-orange-500 hover:bg-orange-600">{isCreatingModule ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> En cours...</> : 'Creer le Module'}</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Store */}
      <Modal isOpen={showEditStoreModal} onClose={() => setShowEditStoreModal(false)} title={`Modifier le store ${storeToEdit?.name}`}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">Nom du Store</label>
            <input type="text" value={editStoreName} onChange={(e) => setEditStoreName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">Icone</label>
            <select value={editStoreIcon} onChange={(e) => setEditStoreIcon(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option value="Smartphone">📱 Smartphone</option>
              <option value="Home">🏠 Home</option>
              <option value="Car">🚗 Car</option>
              <option value="HeartPulse">⚕️ HeartPulse</option>
              <option value="Education">🎓 Education</option>
              <option value="Travel">✈️ Travel</option>
              <option value="Shopping">🛒 Shopping</option>
              <option value="Business">💼 Business</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">Description</label>
            <textarea rows={3} value={editStoreDescription} onChange={(e) => setEditStoreDescription(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">Prix du store (DT / mois)</label>
            <input type="number" min="0" step="0.01" value={editStorePrice} onChange={(e) => setEditStorePrice(e.target.value)} placeholder="Ex: 120" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={editStoreIsActive} onChange={(e) => setEditStoreIsActive(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Actif</span>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowEditStoreModal(false)} disabled={editStoreLoading}>Annuler</Button>
            <Button onClick={confirmEditStore} disabled={editStoreLoading || !editStoreName.trim()} className="bg-orange-500 hover:bg-orange-600">{editStoreLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> En cours...</> : 'Enregistrer les modifications'}</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Module */}
      <Modal isOpen={showEditModuleModal} onClose={() => setShowEditModuleModal(false)} title={`Modifier le module ${moduleToEdit?.label || moduleToEdit?.name}`}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">Nom du Module</label>
            <input type="text" value={editModuleName} onChange={(e) => setEditModuleName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">Categorie</label>
            <input type="text" value={editModuleCategory} onChange={(e) => setEditModuleCategory(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">Description</label>
            <textarea rows={3} placeholder="Ex: Module de simulation de credit..." value={editModuleDescription} onChange={(e) => setEditModuleDescription(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">Icone</label>
            <select value={editModuleIcon} onChange={(e) => setEditModuleIcon(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option value="Calculator">🧮 Calculatrice (Simulateur)</option>
              <option value="GitCompare">🔀 Comparateur</option>
              <option value="BookOpen">📖 Blog / Contenu</option>
              <option value="Bot">🤖 Bot / IA</option>
              <option value="ImageIcon">🖼️ Banniere / Image</option>
              <option value="BarChart">📊 Graphique / Analyse</option>
              <option value="Bell">🔔 Notification</option>
              <option value="Shield">🛡️ Securite</option>
              <option value="Mail">✉️ Email</option>
              <option value="Settings">⚙️ Parametres</option>
              <option value="Users">👥 Utilisateurs</option>
              <option value="Globe">🌐 Web</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={editModuleIsActive} onChange={(e) => setEditModuleIsActive(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Actif</span>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowEditModuleModal(false)} disabled={editModuleLoading}>Annuler</Button>
            <Button onClick={confirmEditModule} disabled={editModuleLoading || !editModuleName.trim()} className="bg-orange-500 hover:bg-orange-600">{editModuleLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> En cours...</> : 'Enregistrer les modifications'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Store */}
      <Modal isOpen={showDeleteStoreModal} onClose={() => setShowDeleteStoreModal(false)} title="Supprimer le Store">
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
            <div><p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">Attention</p><p className="text-sm text-red-700 dark:text-red-300">Vous etes sur le point de supprimer le store <strong>{storeToDelete?.name}</strong>. Cette action est irreversible et supprimera tous les modules associes.</p></div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteStoreModal(false)} disabled={deleteLoading}>Annuler</Button>
            <Button variant="danger" onClick={confirmDeleteStore} disabled={deleteLoading} className="bg-red-500 hover:bg-red-600">{deleteLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Suppression...</> : 'Confirmer la suppression'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Module */}
      <Modal isOpen={showDeleteModuleModal} onClose={() => setShowDeleteModuleModal(false)} title="Supprimer le Module">
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
            <div><p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">Attention</p><p className="text-sm text-red-700 dark:text-red-300">Vous etes sur le point de supprimer le module <strong>{moduleToDelete?.label || moduleToDelete?.name}</strong>. Cette action est irreversible.</p></div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteModuleModal(false)} disabled={deleteLoading}>Annuler</Button>
            <Button variant="danger" onClick={confirmDeleteModule} disabled={deleteLoading} className="bg-red-500 hover:bg-red-600">{deleteLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Suppression...</> : 'Confirmer la suppression'}</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Module Store Price */}
      <Modal
        isOpen={showEditModuleStorePriceModal}
        onClose={() => {
          if (!editModuleStorePriceLoading) {
            setShowEditModuleStorePriceModal(false);
            setModuleStoreToEditPrice(null);
            setEditModuleStorePrice('');
          }
        }}
        title={`Modifier le prix ${moduleStoreToEditPrice?.module.label || moduleStoreToEditPrice?.module.name || ''}`}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">Prix du module (DT / mois)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={editModuleStorePrice}
              onChange={(e) => setEditModuleStorePrice(e.target.value)}
              placeholder="Ex: 50"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModuleStorePriceModal(false);
                setModuleStoreToEditPrice(null);
                setEditModuleStorePrice('');
              }}
              disabled={editModuleStorePriceLoading}
            >
              Annuler
            </Button>
            <Button
              onClick={confirmEditModuleStorePrice}
              disabled={editModuleStorePriceLoading}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {editModuleStorePriceLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  En cours...
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Param Manage */}
      <Modal
        isOpen={showParamManageModal}
        onClose={() => setShowParamManageModal(false)}
        title={paramManageMode === 'create' ? 'Ajouter un parametre' : 'Modifier le parametre'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-2 text-sm text-gray-700 dark:text-gray-300 col-span-2">
              <span>Nom</span>
              <input
                type="text"
                value={paramForm.name}
                onChange={(e) => setParamForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Ex: Taux d'interet, Duree..."
              />
            </label>

            <label className="space-y-2 text-sm text-gray-700 dark:text-gray-300 col-span-2">
              <span>Code</span>
              <input
                type="text"
                value={paramForm.code}
                onChange={(e) => setParamForm((prev) => ({ ...prev, code: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Ex: interest_rate"
              />
            </label>

            <label className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <span>Type</span>
              <select
                value={paramForm.type}
                onChange={(e) =>
                  setParamForm((prev) => ({
                    ...prev,
                    type: e.target.value as 'string' | 'number' | 'boolean' | 'date' | 'select' | 'image',
                  }))
                }
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="string">Texte</option>
                <option value="number">Nombre</option>
                <option value="boolean">Booleen</option>
                <option value="date">Date</option>
                <option value="select">Selection</option>
                <option value="image">Image</option>
              </select>
            </label>

            <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 self-end pb-2">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={paramForm.required}
                  onChange={(e) => setParamForm((prev) => ({ ...prev, required: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                Requis
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowParamManageModal(false)}
              disabled={saveParamLoading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveParam}
              disabled={saveParamLoading || !paramForm.name.trim() || !paramForm.code.trim()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {saveParamLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  En cours...
                </>
              ) : paramManageMode === 'create' ? (
                'Ajouter le parametre'
              ) : (
                'Enregistrer les modifications'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
