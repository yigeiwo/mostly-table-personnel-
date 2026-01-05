import { useState } from 'react';
import { bitable, ITextField, IUserField } from '@lark-base-open/js-sdk';

export interface LogEntry {
  msg: string;
  type: 'info' | 'success' | 'error';
}

export interface ConversionConfig {
  sourceFieldId: string;
  targetFieldId: string;
  mappingTableId: string;
  mappingNameFieldId: string;
  mappingUserFieldId: string;
}

export const useConversion = () => {
  const [isConverting, setIsConverting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (msg: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [{ msg, type }, ...prev].slice(0, 50));
  };

  const startConversion = async (config: ConversionConfig) => {
    const { sourceFieldId, targetFieldId, mappingTableId, mappingNameFieldId, mappingUserFieldId } = config;

    if (!sourceFieldId || !targetFieldId || !mappingTableId || !mappingNameFieldId || !mappingUserFieldId) {
      setStatusMsg('请完善转换和映射设置');
      return;
    }

    setIsConverting(true);
    setStatusMsg('正在初始化处理...');
    setLogs([]);
    setProgress({ current: 0, total: 0 });

    try {
      const activeTable = await bitable.base.getActiveTable();
      const mappingTable = await bitable.base.getTableById(mappingTableId);
      
      // 1. Build mapping
      addLog(`正在从映射表构建关系...`, 'info');
      const nameToIdMap = new Map<string, string>();
      const { records: mappingRecords } = await mappingTable.getRecords({ pageSize: 5000 });
      
      mappingRecords.forEach(record => {
        const nameVal = record.fields[mappingNameFieldId];
        const userVal = record.fields[mappingUserFieldId];
        
        let name = '';
        if (typeof nameVal === 'string') {
          name = nameVal.trim().toLowerCase();
        } else if (Array.isArray(nameVal)) {
          name = nameVal.map((v: any) => v.text || '').join('').trim().toLowerCase();
        }

        if (name && userVal && Array.isArray(userVal) && userVal.length > 0) {
          const userId = (userVal[0] as any)?.id;
          if (userId) nameToIdMap.set(name, userId);
        }
      });

      if (nameToIdMap.size === 0) {
        throw new Error('映射表中未找到有效的对应关系');
      }

      addLog(`映射构建完成，共 ${nameToIdMap.size} 条规则`, 'success');

      // 2. Process records
      const recordIds = await activeTable.getRecordIdList();
      const total = recordIds.length;
      setProgress({ current: 0, total });
      
      const sourceField = await activeTable.getField<ITextField>(sourceFieldId);
      const targetField = await activeTable.getField<IUserField>(targetFieldId);

      let successCount = 0;
      let failCount = 0;
      let skipCount = 0;

      // Batch processing would be better, but for now we follow the existing logic with progress
      for (let i = 0; i < recordIds.length; i++) {
        const recordId = recordIds[i];
        setProgress(p => ({ ...p, current: i + 1 }));

        try {
          const textValue = await sourceField.getValue(recordId);
          let originalName = '';
          if (textValue) {
            originalName = typeof textValue === 'string' 
              ? textValue 
              : textValue.map((v: any) => v.text || '').join('');
          }

          const name = originalName.trim().toLowerCase();
          if (!name) {
            skipCount++;
            continue;
          }

          const userId = nameToIdMap.get(name);
          if (userId) {
            await targetField.setValue(recordId, [{ id: userId }]);
            addLog(`第 ${i+1} 行: "${originalName.trim()}" 成功`, 'success');
            successCount++;
          } else {
            addLog(`第 ${i+1} 行: "${originalName.trim()}" 未匹配`, 'error');
            failCount++;
          }
        } catch (err: any) {
          addLog(`第 ${i+1} 行: 错误 - ${err.message}`, 'error');
          failCount++;
        }
      }

      setStatusMsg(`处理完成！成功: ${successCount}, 失败: ${failCount}, 跳过: ${skipCount}`);
    } catch (error: any) {
      console.error(error);
      setStatusMsg(`失败: ${error.message || '未知错误'}`);
    } finally {
      setIsConverting(false);
    }
  };

  return { isConverting, statusMsg, progress, logs, startConversion };
};
