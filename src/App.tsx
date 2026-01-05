import { useState, useEffect } from 'react';
import './App.css';
import { useBitableData, useTableFields } from './hooks/useBitableData';
import { useConversion } from './hooks/useConversion';
import { 
  Header, 
  StatusCard, 
  MappingSettings, 
  ConversionSettings, 
  ExecutionLogs 
} from './components';

/**
 * Main App Component
 * 
 * This plugin converts person names (Text field) to User objects (User field)
 * based on a mapping table.
 */
function App() {
  // 1. Fetch basic bitable data
  const { tableName, recordCount, tableList, textFields, userFields } = useBitableData();

  // 2. Local state for selections
  const [selectedMappingTableId, setSelectedMappingTableId] = useState<string>('');
  const [selectedMappingNameFieldId, setSelectedMappingNameFieldId] = useState<string>('');
  const [selectedMappingUserFieldId, setSelectedMappingUserFieldId] = useState<string>('');
  const [selectedSourceFieldId, setSelectedSourceFieldId] = useState<string>('');
  const [selectedTargetFieldId, setSelectedTargetFieldId] = useState<string>('');

  // 3. Fetch fields for the selected mapping table
  const mappingTableFields = useTableFields(selectedMappingTableId);

  // 4. Conversion logic hook
  const { isConverting, statusMsg, progress, logs, startConversion } = useConversion();

  // Initialize selections when data is loaded
  useEffect(() => {
    if (tableList.length > 0 && !selectedMappingTableId) {
      // Default to first table or search for a table named '员工' or similar
      setSelectedMappingTableId(tableList[0].id);
    }
    if (textFields.length > 0 && !selectedSourceFieldId) {
      setSelectedSourceFieldId(textFields[0].id);
    }
    if (userFields.length > 0 && !selectedTargetFieldId) {
      setSelectedTargetFieldId(userFields[0].id);
    }
  }, [tableList, textFields, userFields]);

  // Update mapping fields when mapping table fields change
  useEffect(() => {
    if (mappingTableFields.textFields.length > 0) {
      setSelectedMappingNameFieldId(mappingTableFields.textFields[0].id);
    }
    if (mappingTableFields.userFields.length > 0) {
      setSelectedMappingUserFieldId(mappingTableFields.userFields[0].id);
    }
  }, [mappingTableFields]);

  const handleStart = () => {
    startConversion({
      sourceFieldId: selectedSourceFieldId,
      targetFieldId: selectedTargetFieldId,
      mappingTableId: selectedMappingTableId,
      mappingNameFieldId: selectedMappingNameFieldId,
      mappingUserFieldId: selectedMappingUserFieldId,
    });
  };

  return (
    <div className="container">
      <Header />
      
      <StatusCard 
        tableName={tableName} 
        recordCount={recordCount} 
      />

      <MappingSettings 
        tableList={tableList}
        selectedTableId={selectedMappingTableId}
        onTableChange={setSelectedMappingTableId}
        textFields={mappingTableFields.textFields}
        selectedNameFieldId={selectedMappingNameFieldId}
        onNameFieldChange={setSelectedMappingNameFieldId}
        userFields={mappingTableFields.userFields}
        selectedUserFieldId={selectedMappingUserFieldId}
        onUserFieldChange={setSelectedMappingUserFieldId}
        disabled={isConverting}
      />

      <ConversionSettings 
        textFields={textFields}
        selectedSourceId={selectedSourceFieldId}
        onSourceChange={setSelectedSourceFieldId}
        userFields={userFields}
        selectedTargetId={selectedTargetFieldId}
        onTargetChange={setSelectedTargetFieldId}
        isConverting={isConverting}
        progress={progress}
        statusMsg={statusMsg}
        onStart={handleStart}
      />

      <ExecutionLogs logs={logs} />

      <p className="footer">
        多维表格插件 - 人名转人员 v1.1.0
      </p>
    </div>
  );
}

export default App;
