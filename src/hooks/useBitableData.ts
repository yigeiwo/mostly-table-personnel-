import { useState, useEffect } from 'react';
import { bitable, IFieldMeta, ITableMeta, FieldType } from '@lark-base-open/js-sdk';

export interface BitableData {
  tableName: string;
  recordCount: number;
  tableList: ITableMeta[];
  textFields: IFieldMeta[];
  userFields: IFieldMeta[];
}

/**
 * Hook to manage Bitable data fetching and synchronization
 */
export const useBitableData = () => {
  const [data, setData] = useState<BitableData>({
    tableName: 'Loading...',
    recordCount: 0,
    tableList: [],
    textFields: [],
    userFields: [],
  });

  const refreshData = async () => {
    try {
      const activeTable = await bitable.base.getActiveTable();
      const name = await activeTable.getName();
      const recordList = await activeTable.getRecordIdList();
      
      const tables = await bitable.base.getTableMetaList();
      const allFields = await activeTable.getFieldMetaList();
      
      const tFields = allFields.filter(f => f.type === FieldType.Text);
      const uFields = allFields.filter(f => f.type === FieldType.User);

      setData({
        tableName: name,
        recordCount: recordList.length,
        tableList: tables,
        textFields: tFields,
        userFields: uFields,
      });
    } catch (error) {
      console.error('Failed to fetch bitable data:', error);
    }
  };

  useEffect(() => {
    refreshData();
    
    // Optional: Listen to table changes if the SDK supports it
    // bitable.base.onSelectionChange(refreshData);
  }, []);

  return { ...data, refreshData };
};

/**
 * Hook to manage fields for a specific table
 */
export const useTableFields = (tableId: string | undefined) => {
  const [fields, setFields] = useState<{ textFields: IFieldMeta[]; userFields: IFieldMeta[] }>({
    textFields: [],
    userFields: [],
  });

  useEffect(() => {
    const fetchFields = async () => {
      if (!tableId) return;
      try {
        const table = await bitable.base.getTableById(tableId);
        const allFields = await table.getFieldMetaList();
        setFields({
          textFields: allFields.filter(f => f.type === FieldType.Text),
          userFields: allFields.filter(f => f.type === FieldType.User),
        });
      } catch (error) {
        console.error(`Failed to fetch fields for table ${tableId}:`, error);
      }
    };
    fetchFields();
  }, [tableId]);

  return fields;
};
