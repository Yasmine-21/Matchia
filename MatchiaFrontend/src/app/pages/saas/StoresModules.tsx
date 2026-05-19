import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  Smartphone, Home, Car, HeartPulse, Calculator, GitCompare,
  GraduationCap, Plane, ShoppingCart, Briefcase, BookOpen, Bot,
  Image as ImageIcon, Settings as SettingsIcon, X, AlertTriangle,
  BarChart, Bell, Shield, Mail, Users, Globe,
  Plus, Edit, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import { storeService } from '../../services/storeService';
import { moduleService } from '../../services/moduleService';
import { ModuleDto, StoreDto, ModuleAssignment, ModuleParameter } from '../../types/apiTypes';


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

interface StoreUIDto extends StoreDto {
  modules: number;
  IconComponent: any;
  iconName: string;
}

interface ModuleUIDto extends ModuleDto {
  IconComponent: any;
  iconName: string;
}

interface LocalModuleParameter {
  label: string;
  name: string;
  code: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select';
  required: boolean;
}

//  l'affichage d'un module assigné
function AssignedModuleItem({
  assignment,
  isExpanded,
  onToggleExpand,
  onToggleModule
}: {
  assignment: ModuleAssignment;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleModule: (moduleId: number, currentStatus: boolean) => void;
}) {
  const Icon = moduleIconMap[assignment.module.icon || 'BookOpen'] || BookOpen;

  return (
    <div
      className={`bg-gray-50 dark:bg-gray-800/50 rounded-xl border transition-all ${
        assignment.actif 
          ? 'border-gray-200 dark:border-gray-700' 
          : 'border-gray-200 dark:border-gray-700 opacity-60'
      }`}
    >
      {/* Module Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Icon className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h5 className="font-medium text-gray-900 dark:text-white">
                {assignment.module.label || assignment.module.name}
              </h5>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {assignment.module.category || 'Module'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
              {/* Status */}
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
            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={assignment.actif}
                onChange={() => onToggleModule(assignment.module.id, assignment.actif)}
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

      {/* Module Parameters */}
      {isExpanded && assignment.actif && (
        <div className="p-4 pt-0 border-t border-gray-200 dark:border-gray-700">
          <div className="pt-4">
            <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              Paramètres du module
            </h6>
            <div className="space-y-3">
              {assignment.parameters && assignment.parameters.length > 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Paramètre
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Requis
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                      {assignment.parameters.map((param) => (
                        <tr key={param.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                            {param.label}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            <Badge variant="secondary" className="text-xs bg-gray-100 dark:bg-gray-800">
                              {param.type === 'string' && 'Texte'}
                              {param.type === 'number' && 'Nombre'}
                              {param.type === 'boolean' && 'Booléen'}
                              {param.type === 'date' && 'Date'}
                              {param.type === 'select' && 'Sélection'}
                              {!param.type && 'Texte'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {param.required ? (
                              <Badge variant="warning" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                Requis
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                Optionnel
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <SettingsIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Aucun paramètre configurable pour ce module
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Disabled module message */}
      {isExpanded && !assignment.actif && (
        <div className="p-4 pt-0">
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ce module est désactivé. Activez-le pour voir ses paramètres.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant enfant pour une carte de store
function StoreCard({ store, onEdit, onSuspend }: { 
  store: StoreUIDto; 
  onEdit: (store: StoreUIDto) => void;
  onSuspend: (store: StoreUIDto) => void;
}) {
  const Icon = store.IconComponent;
  
  return (
    <Card className={store.status === 'inactive' ? 'opacity-80' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between mb-3">
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              store.status === 'active'
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-500'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
            }`}
          >
            <Icon className="w-6 h-6" />
          </div>
          <Badge variant={store.status === 'active' ? 'success' : 'default'}>
            {store.status === 'active' ? 'Actif' : 'Inactif'}
          </Badge>
        </div>
        <CardTitle className="capitalize">{store.name}</CardTitle>
        <CardDescription>{store.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Modules assignés</div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{store.modules}</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20"
            icon={<Edit className="w-4 h-4" />}
            onClick={() => onEdit(store)}
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

// Composant enfant pour une carte de module
function ModuleCard({ module, onAssign }: { 
  module: ModuleUIDto; 
  onAssign: (module: ModuleDto) => void;
}) {
  const Icon = module.IconComponent;
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-orange-500" />
        </div>
        <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800">
          {module.category || module.label || module.name}
        </Badge>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {module.label || module.name}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Module disponible pour assignment
      </p>
      <Badge variant="success" className="mb-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        Global Actif
      </Badge>
      <Button
        size="sm"
        variant="outline"
        className="w-full border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
        onClick={() => onAssign(module)}
      >
        Assigner à un Store
      </Button>
    </div>
  );
}

export function SaaSStoresModules() {
  // Store creation state
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreIcon, setNewStoreIcon] = useState('Smartphone');
  const [newStoreDescription, setNewStoreDescription] = useState('');
  const [newStoreIsActive, setNewStoreIsActive] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Tab & UI state
  const [activeTab, setActiveTab] = useState('stores');
  const [showDrawer, setShowDrawer] = useState(false);
  const [expandedModuleId, setExpandedModuleId] = useState<number | null>(null);
  const [togglingModuleId, setTogglingModuleId] = useState<number | null>(null);

  // Data state
  const [stores, setStores] = useState<StoreUIDto[]>([]);
  const [modulesList, setModulesList] = useState<ModuleUIDto[]>([]);
  const [assignedModules, setAssignedModules] = useState<ModuleAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isLoadingModules, setIsLoadingModules] = useState(false);

  // Modal state
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [storeToSuspend, setStoreToSuspend] = useState<StoreUIDto | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [moduleToAssign, setModuleToAssign] = useState<ModuleDto | null>(null);
  const [assignTargetStore, setAssignTargetStore] = useState<StoreUIDto | null>(null);
  const [currentParameters, setCurrentParameters] = useState<LocalModuleParameter[]>([]);
  const [currentParameterForm, setCurrentParameterForm] = useState<LocalModuleParameter>({
    label: '',
    name: '',
    code: '',
    type: 'string',
    required: false,
  });
  const [showParameterForm, setShowParameterForm] = useState(false);
  const [isAssigningModule, setIsAssigningModule] = useState(false);
  const [showCreateStoreModal, setShowCreateStoreModal] = useState(false);
  const [showCreateModuleModal, setShowCreateModuleModal] = useState(false);

  // Module creation state
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleCategory, setNewModuleCategory] = useState('');
  const [newModuleIcon, setNewModuleIcon] = useState('Calculator');
  const [newModuleIsActive, setNewModuleIsActive] = useState(true);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  
  // Selected store
  const [selectedStore, setSelectedStore] = useState<StoreUIDto | null>(null);

  useEffect(() => {
    fetchStores();
    loadModules();
  }, []);

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
      console.log('Paramètres reçus de l\'API:', response.data);
      setAssignedModules(response.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des modules assignés:', error);
      setAssignedModules([]);
    } finally {
      setIsLoadingModules(false);
    }
  };

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) {
      alert('Le nom du store est requis');
      return;
    }
    setIsCreating(true);
    const payload: any = {
      name: newStoreName.toLowerCase(),
      icon: newStoreIcon,
      description: newStoreDescription,
      status: newStoreIsActive ? 'active' : 'inactive',
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
      setNewStoreIsActive(true);
      setShowCreateStoreModal(false);
      setIsCreating(false);
    }
  };

  const handleEditStore = async (store: StoreUIDto) => {
    setSelectedStore(store);
    await loadAssignedModulesForStore(store.id);
    setShowDrawer(true);
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

  const resetAssignState = () => {
    setAssignTargetStore(null);
    setCurrentParameters([]);
    setCurrentParameterForm({
      label: '',
      name: '',
      code: '',
      type: 'string',
      required: false,
    });
    setShowParameterForm(false);
    setIsAssigningModule(false);
  };

  const handleAssignModule = (module: ModuleDto) => {
    setModuleToAssign(module);
    setShowAssignModal(true);
    resetAssignState();
  };

  const handleSelectTargetStore = (store: StoreUIDto) => {
    setAssignTargetStore(store);
    setCurrentParameters([]);
    setCurrentParameterForm({
      label: '',
      name: '',
      code: '',
      type: 'string',
      required: false,
    });
    setShowParameterForm(false);
  };

  const handleAddParameter = () => {
    setShowParameterForm(true);
    setCurrentParameterForm({
      label: '',
      name: '',
      code: '',
      type: 'string',
      required: false,
    });
  };

  const handleConfirmParameter = () => {
    if (!currentParameterForm.label.trim() || !currentParameterForm.code.trim()) {
      alert('Le libellé et le code du paramètre sont requis.');
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
      label: '',
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

  const confirmAssignModule = async (storeId: number) => {
    if (!moduleToAssign || !assignTargetStore) return;
    if (currentParameters.length === 0) {
      alert('Ajoutez au moins un paramètre avant de confirmer l\'assignation.');
      return;
    }

    setIsAssigningModule(true);
    try {
      await moduleService.assignModuleToStoreFull({
         store: {
          id: storeId,
          },
         module: {
          id: moduleToAssign.id,
          },
        actif: true,
        ordre: assignTargetStore.modules + 1,
        parameters: currentParameters.map((param) => ({
          label: param.label,
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

  const handleToggleModule = async (storeId: number, moduleId: number, currentStatus: boolean) => {
    setTogglingModuleId(moduleId);
    try {
      await moduleService.toggleModuleForStore(storeId, moduleId, !currentStatus);
      
      // Mettre à jour l'état local
      setAssignedModules(prev =>
        prev.map(item =>
          item.module.id === moduleId
            ? { ...item, actif: !currentStatus }
            : item
        )
      );
      
      // Si le module est désactivé, fermer l'expansion
      if (currentStatus) {
        setExpandedModuleId(null);
      }
    } catch (error) {
      console.error('Erreur lors du toggle du module:', error);
      alert('Erreur lors de la modification du statut du module');
    } finally {
      setTogglingModuleId(null);
    }
  };

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

  const toggleExpand = (moduleId: number) => {
    setExpandedModuleId(expandedModuleId === moduleId ? null : moduleId);
  };

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
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

      {/* STORES TAB */}
      {!loading && activeTab === 'stores' && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-lg text-gray-500 dark:text-gray-400">
                Gérez les stores disponibles sur la plateforme
              </p>
            </div>
            <Button onClick={() => setShowCreateStoreModal(true)} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4" />
              Créer un Store
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                onEdit={handleEditStore}
                onSuspend={handleSuspendStore}
              />
            ))}
          </div>
        </>
      )}

      {/* MODULES TAB */}
      {activeTab === 'modules' && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-lg text-gray-500 dark:text-gray-400">
                Gérez les modules disponibles sur la plateforme
              </p>
            </div>
            <Button onClick={() => setShowCreateModuleModal(true)} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4" />
              Créer un Module
            </Button>
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modulesList.map((module) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  onAssign={handleAssignModule}
                />
              ))}

              {modulesList.length === 0 && (
                <div className="col-span-3 text-center py-12 text-gray-500 dark:text-gray-400">
                  Aucun module disponible.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* STORE DETAIL DRAWER */}
      {showDrawer && selectedStore && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setShowDrawer(false);
              setExpandedModuleId(null);
            }}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-4xl bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  {selectedStore.IconComponent && <selectedStore.IconComponent className="w-5 h-5 text-orange-500" />}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Configuration {selectedStore.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Activez/Désactivez les modules et consultez leurs paramètres
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
              {/* Modules Assignés */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                    Modules assignés
                  </h4>
                  <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800">
                    {assignedModules.length} module(s)
                  </Badge>
                </div>

                {isLoadingModules ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
                  </div>
                ) : assignedModules.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <p className="text-gray-500 dark:text-gray-400">
                      Aucun module assigné à ce store
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
                    {assignedModules.map((assignment) => (
                      <AssignedModuleItem
                        key={assignment.module.id}
                        assignment={assignment}
                        isExpanded={expandedModuleId === assignment.module.id}
                        onToggleExpand={() => toggleExpand(assignment.module.id)}
                        onToggleModule={(moduleId, currentStatus) => 
                          handleToggleModule(selectedStore.id, moduleId, currentStatus)
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
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

      {/* SUSPEND MODAL */}
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
                    La suspension du store <strong>{storeToSuspend?.name}</strong> désactivera
                    tous ses modules et empêchera les utilisateurs d'y accéder.
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Les données du store seront conservées et vous pourrez le réactiver à tout moment.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-900 dark:text-white">
                Voulez-vous activer le store <strong>{storeToSuspend?.name}</strong> ?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                L'activation permettra aux utilisateurs d'accéder au store et à ses modules.
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

      {/* ASSIGN MODULE MODAL */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          resetAssignState();
        }}
        title={`Assigner ${moduleToAssign?.name} à un Store`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Sélectionnez un store, puis configurez les paramètres pour l'assignation du module{' '}
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
                      {store.modules} modules assignés
                    </p>
                  </div>
                  <Badge variant={store.status === 'active' ? 'success' : 'default'}>
                    {store.status === 'active' ? 'Actif' : 'Inactif'}
                  </Badge>
                </button>
              );
            })}
          </div>

          {assignTargetStore && (
            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Store sélectionné</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{assignTargetStore.name}</p>
                </div>
                <Badge variant={assignTargetStore.status === 'active' ? 'success' : 'default'}>
                  {assignTargetStore.status === 'active' ? 'Actif' : 'Inactif'}
                </Badge>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={handleAddParameter}
                >
                  Ajouter un paramètre
                </Button>
                {currentParameters.length > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {currentParameters.length} paramètre(s) configuré(s)
                  </p>
                )}
              </div>
            </div>
          )}

          {showParameterForm && assignTargetStore && (
            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <div className="mb-4">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">Ajouter un paramètre</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Remplissez les informations du paramètre à envoyer au store.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <span>Label</span>
                  <input
                    type="text"
                    value={currentParameterForm.label}
                    onChange={(e) =>
                      setCurrentParameterForm((prev) => ({ ...prev, label: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Ex: Taux, Durée..."
                  />
                </label>

                <label className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <span>Nom interne</span>
                  <input
                    type="text"
                    value={currentParameterForm.name}
                    onChange={(e) =>
                      setCurrentParameterForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Ex: interestRate"
                  />
                </label>

                <label className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <span>Code</span>
                  <input
                    type="text"
                    value={currentParameterForm.code}
                    onChange={(e) =>
                      setCurrentParameterForm((prev) => ({ ...prev, code: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Ex: rate"
                  />
                </label>

                <label className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <span>Type</span>
                  <select
                    value={currentParameterForm.type}
                    onChange={(e) =>
                      setCurrentParameterForm((prev) => ({ ...prev, type: e.target.value as LocalModuleParameter['type'] }))
                    }
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="string">Texte</option>
                    <option value="number">Nombre</option>
                    <option value="boolean">Booléen</option>
                    <option value="date">Date</option>
                    <option value="select">Sélection</option>
                  </select>
                </label>

                <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={currentParameterForm.required}
                      onChange={(e) =>
                        setCurrentParameterForm((prev) => ({ ...prev, required: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    Requis
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowParameterForm(false);
                    setCurrentParameterForm({
                      label: '',
                      name: '',
                      code: '',
                      type: 'string',
                      required: false,
                    });
                  }}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleConfirmParameter}
                  disabled={!currentParameterForm.label.trim() || !currentParameterForm.code.trim()}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Confirmer paramètre
                </Button>
              </div>
            </div>
          )}

          {currentParameters.length > 0 && (
            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">Paramètres ajoutés</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Label</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Requis</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {currentParameters.map((param, index) => (
                      <tr key={`${param.code}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{param.label}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{param.code}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant="secondary" className="text-xs bg-gray-100 dark:bg-gray-800">
                            {param.type === 'string' && 'Texte'}
                            {param.type === 'number' && 'Nombre'}
                            {param.type === 'boolean' && 'Booléen'}
                            {param.type === 'date' && 'Date'}
                            {param.type === 'select' && 'Sélection'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {param.required ? (
                            <Badge variant="warning" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              Requis
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                              Optionnel
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteParameter(index)}
                            className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            Supprimer
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignModal(false);
                resetAssignState();
              }}
            >
              Annuler
            </Button>
            {assignTargetStore && currentParameters.length > 0 && (
              <Button
                onClick={() => confirmAssignModule(assignTargetStore.id)}
                className="bg-orange-500 hover:bg-orange-600"
                disabled={isAssigningModule}
              >
                {isAssigningModule ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirmer l'assignation
                  </>
                ) : (
                  "Confirmer l'assignation"
                )}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* CREATE STORE MODAL */}
      <Modal
        isOpen={showCreateStoreModal}
        onClose={() => setShowCreateStoreModal(false)}
        title="Créer un Store"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">
              Nom du Store
            </label>
            <input
              type="text"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              placeholder="Ex: Éducation, Voyage, etc."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">Icône</label>
            <select
              value={newStoreIcon}
              onChange={(e) => setNewStoreIcon(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
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
            <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">
              Description
            </label>
            <textarea
              rows={3}
              value={newStoreDescription}
              onChange={(e) => setNewStoreDescription(e.target.value)}
              placeholder="Description du store..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={newStoreIsActive}
              onChange={(e) => setNewStoreIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Activer immédiatement</span>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCreateStoreModal(false)} disabled={isCreating}>
              Annuler
            </Button>
            <Button onClick={handleCreateStore} disabled={isCreating || !newStoreName.trim()} className="bg-orange-500 hover:bg-orange-600">
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> En cours...
                </>
              ) : (
                'Créer le store'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* CREATE MODULE MODAL */}
      <Modal
        isOpen={showCreateModuleModal}
        onClose={() => {
          setShowCreateModuleModal(false);
          setNewModuleName('');
          setNewModuleCategory('');
          setNewModuleIcon('Calculator');
          setNewModuleIsActive(true);
        }}
        title="Créer un Module"
      >
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Informations du Module</h4>
            
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">
                Nom du Module
              </label>
              <input
                type="text"
                placeholder="Ex: Simulateur, Comparateur, etc."
                value={newModuleName}
                onChange={(e) => setNewModuleName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">
                Catégorie
              </label>
              <input
                type="text"
                placeholder="Ex: Calcul, Analyse, Contenu, etc."
                value={newModuleCategory}
                onChange={(e) => setNewModuleCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-900 dark:text-white mb-1.5 block">Icône</label>
              <select
                value={newModuleIcon}
                onChange={(e) => setNewModuleIcon(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="Calculator">🧮 Calculatrice (Simulateur)</option>
                <option value="GitCompare">🔀 Comparateur</option>
                <option value="BookOpen">📖 Blog / Contenu</option>
                <option value="Bot">🤖 Bot / IA</option>
                <option value="ImageIcon">🖼️ Bannière / Image</option>
                <option value="BarChart">📊 Graphique / Analyse</option>
                <option value="Bell">🔔 Notification</option>
                <option value="Shield">🛡️ Sécurité</option>
                <option value="Mail">✉️ Email</option>
                <option value="Settings">⚙️ Paramètres</option>
                <option value="Users">👥 Utilisateurs</option>
                <option value="Globe">🌐 Web</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newModuleIsActive}
                onChange={(e) => setNewModuleIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Activer immédiatement</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModuleModal(false);
                setNewModuleName('');
                setNewModuleCategory('');
                setNewModuleIcon('Calculator');
                setNewModuleIsActive(true);
              }}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleCreateModule}
              disabled={isCreatingModule || !newModuleName.trim()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isCreatingModule ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> En cours...
                </>
              ) : (
                'Créer le Module'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}