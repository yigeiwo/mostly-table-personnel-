import { useState, useEffect } from 'react'
import { bitable, FieldType, IFieldMeta, ITextField, IUserField, ITableMeta } from '@lark-base-open/js-sdk'
import './App.css'

function App() {
  const [tableName, setTableName] = useState<string>('Loading...')
  const [recordCount, setRecordCount] = useState<number>(0)
  const [isConverting, setIsConverting] = useState<boolean>(false)
  const [statusMsg, setStatusMsg] = useState<string>('')
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 })
  const [logs, setLogs] = useState<{ msg: string; type: 'info' | 'success' | 'error' }[]>([])
  
  // 当前表字段列表
  const [textFields, setTextFields] = useState<IFieldMeta[]>([])
  const [userFields, setUserFields] = useState<IFieldMeta[]>([])
  
  // 映射设置状态
  const [tableList, setTableList] = useState<ITableMeta[]>([])
  const [selectedMappingTableId, setSelectedMappingTableId] = useState<string>('')
  const [mappingTextFields, setMappingTextFields] = useState<IFieldMeta[]>([])
  const [mappingUserFields, setMappingUserFields] = useState<IFieldMeta[]>([])
  const [selectedMappingNameFieldId, setSelectedMappingNameFieldId] = useState<string>('')
  const [selectedMappingUserFieldId, setSelectedMappingUserFieldId] = useState<string>('')

  // 转换选择状态
  const [selectedSourceFieldId, setSelectedSourceFieldId] = useState<string>('')
  const [selectedTargetFieldId, setSelectedTargetFieldId] = useState<string>('')

  // 初始化：获取当前表信息和所有表列表
  useEffect(() => {
    const initData = async () => {
      try {
        const activeTable = await bitable.base.getActiveTable()
        const name = await activeTable.getName()
        setTableName(name)
        const recordList = await activeTable.getRecordIdList()
        setRecordCount(recordList.length)

        // 获取所有表列表供选择映射表
        const tables = await bitable.base.getTableMetaList()
        setTableList(tables)
        if (tables.length > 0 && !selectedMappingTableId) {
          setSelectedMappingTableId(activeTable.id) // 默认选当前表
        }

        // 获取当前表的可选字段
        const allFields = await activeTable.getFieldMetaList()
        const tFields = allFields.filter(f => f.type === FieldType.Text)
        const uFields = allFields.filter(f => f.type === FieldType.User)
        setTextFields(tFields)
        setUserFields(uFields)
        
        if (tFields.length > 0 && !selectedSourceFieldId) setSelectedSourceFieldId(tFields[0].id)
        if (uFields.length > 0 && !selectedTargetFieldId) setSelectedTargetFieldId(uFields[0].id)
      } catch (error) {
        console.error('Init failed:', error)
      }
    }
    initData()
  }, [])

  // 当映射表改变时，获取映射表的字段列表
  useEffect(() => {
    const updateMappingFields = async () => {
      if (!selectedMappingTableId) return
      try {
        const table = await bitable.base.getTableById(selectedMappingTableId)
        const allFields = await table.getFieldMetaList()
        
        const tFields = allFields.filter(f => f.type === FieldType.Text)
        const uFields = allFields.filter(f => f.type === FieldType.User)
        
        setMappingTextFields(tFields)
        setMappingUserFields(uFields)
        
        if (tFields.length > 0) setSelectedMappingNameFieldId(tFields[0].id)
        if (uFields.length > 0) setSelectedMappingUserFieldId(uFields[0].id)
      } catch (error) {
        console.error('Failed to update mapping fields:', error)
      }
    }
    updateMappingFields()
  }, [selectedMappingTableId])

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [{ msg, type }, ...prev].slice(0, 50))
  }

  const handleConvert = async () => {
    if (!selectedSourceFieldId || !selectedTargetFieldId || !selectedMappingTableId || !selectedMappingNameFieldId || !selectedMappingUserFieldId) {
      setStatusMsg('请完善转换和映射设置')
      return
    }

    setIsConverting(true)
    setStatusMsg('正在初始化处理...')
    setLogs([])

    try {
      const activeTable = await bitable.base.getActiveTable()
      const mappingTable = await bitable.base.getTableById(selectedMappingTableId)
      
      // 1. 从指定的映射表建立姓名-ID 映射
      addLog(`正在从映射表 [${(await mappingTable.getName())}] 构建映射关系...`, 'info')
      const nameToIdMap = new Map<string, string>()

      // 批量获取映射表记录
      const { records: mappingRecords } = await mappingTable.getRecords({ pageSize: 5000 })
      
      mappingRecords.forEach(record => {
        const nameVal = record.fields[selectedMappingNameFieldId]
        const userVal = record.fields[selectedMappingUserFieldId]
        
        let name = ''
        if (typeof nameVal === 'string') {
          name = nameVal.trim().toLowerCase()
        } else if (Array.isArray(nameVal)) {
          name = nameVal.map((v: any) => v.text || '').join('').trim().toLowerCase()
        }

        if (name && userVal && Array.isArray(userVal) && userVal.length > 0) {
          // 取第一个人员
          const user = userVal[0] as any
          const userId = user?.id
          if (userId) {
            nameToIdMap.set(name, userId)
          }
        }
      })

      if (nameToIdMap.size === 0) {
        throw new Error('映射表中未找到有效的“姓名-人员”对应关系，请检查字段选择和数据。')
      }

      addLog(`映射关系构建完成，共识别 ${nameToIdMap.size} 条规则`, 'success')

      // 2. 开始转换主表数据
      const recordIds = await activeTable.getRecordIdList()
      const total = recordIds.length
      setProgress({ current: 0, total })
      
      const sourceField = await activeTable.getField<ITextField>(selectedSourceFieldId)
      const targetField = await activeTable.getField<IUserField>(selectedTargetFieldId)

      let successCount = 0
      let skipCount = 0
      let failCount = 0

      for (let i = 0; i < recordIds.length; i++) {
        const recordId = recordIds[i]
        setProgress({ current: i + 1, total })

        try {
          const textValue = await sourceField.getValue(recordId)
          let originalName = ''
          if (textValue) {
            if (typeof textValue === 'string') {
              originalName = textValue
            } else if (Array.isArray(textValue)) {
              originalName = textValue.map((v: any) => v.text || '').join('')
            }
          }

          const name = originalName.trim().toLowerCase()
          if (!name) {
            skipCount++
            continue
          }

          const userId = nameToIdMap.get(name)
          if (userId) {
            await targetField.setValue(recordId, [{ id: userId }])
            addLog(`第 ${i+1} 行: "${originalName.trim()}" 转换成功`, 'success')
            successCount++
          } else {
            addLog(`第 ${i+1} 行: "${originalName.trim()}" 未匹配到映射`, 'error')
            failCount++
          }
        } catch (err: any) {
          addLog(`第 ${i+1} 行: 错误 - ${err.message}`, 'error')
          failCount++
        }
      }

      setStatusMsg(`处理完成！成功: ${successCount}, 失败: ${failCount}, 跳过: ${skipCount}`)
    } catch (error: any) {
      console.error(error)
      setStatusMsg(`失败: ${error.message || '未知错误'}`)
    } finally {
      setIsConverting(false)
      setProgress({ current: 0, total: 0 })
    }
  }

  return (
    <div className="container">
      <h1>人名转人员工具</h1>
      
      <div className="card">
        <h3>📊 运行环境</h3>
        <p>目标表: <strong>{tableName}</strong></p>
        <p>记录数: <strong>{recordCount}</strong></p>
      </div>

      <div className="card">
        <h3>🗺️ 映射设置</h3>
        <p className="desc">请选择包含“姓名”与“人员”对应关系的映射表及字段</p>
        
        <div className="form-group">
          <label>选择映射表</label>
          <select 
            value={selectedMappingTableId} 
            onChange={(e) => setSelectedMappingTableId(e.target.value)}
            disabled={isConverting}
            className="field-select"
          >
            {tableList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group half">
            <label>映射姓名列 (文本)</label>
            <select 
              value={selectedMappingNameFieldId} 
              onChange={(e) => setSelectedMappingNameFieldId(e.target.value)}
              disabled={isConverting}
              className="field-select"
            >
              {mappingTextFields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="form-group half">
            <label>映射人员列 (人员)</label>
            <select 
              value={selectedMappingUserFieldId} 
              onChange={(e) => setSelectedMappingUserFieldId(e.target.value)}
              disabled={isConverting}
              className="field-select"
            >
              {mappingUserFields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>🔄 转换设置</h3>
        <p className="desc">根据上述映射规则，将当前表的文本字段转换为人员字段</p>
        
        <div className="form-group">
          <label>📝 源文本列 (待转人名)</label>
          <select 
            value={selectedSourceFieldId} 
            onChange={(e) => setSelectedSourceFieldId(e.target.value)}
            disabled={isConverting}
            className="field-select"
          >
            {textFields.map(field => <option key={field.id} value={field.id}>{field.name}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>� 目标人员列 (填充结果)</label>
          <select 
            value={selectedTargetFieldId} 
            onChange={(e) => setSelectedTargetFieldId(e.target.value)}
            disabled={isConverting}
            className="field-select"
          >
            {userFields.map(field => <option key={field.id} value={field.id}>{field.name}</option>)}
          </select>
        </div>

        {isConverting && progress.total > 0 && (
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
            <p className="progress-text">{progress.current} / {progress.total}</p>
          </div>
        )}

        <button 
          onClick={handleConvert} 
          disabled={isConverting || !selectedSourceFieldId || !selectedTargetFieldId}
          className={`convert-btn ${isConverting ? 'loading' : ''}`}
        >
          {isConverting ? '正在转换中...' : '开始执行转换'}
        </button>
        {statusMsg && <p className={`status-msg ${statusMsg.includes('完成') || statusMsg.includes('成功') ? 'success' : 'error'}`}>{statusMsg}</p>}

        {logs.length > 0 && (
          <div className="log-container">
            <h4>执行日志</h4>
            <div className="log-list">
              {logs.map((log, index) => (
                <div key={index} className={`log-item ${log.type}`}>
                  {log.msg}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="footer">
        多维表格插件 - 人名转人员
      </p>
    </div>
  )
}

export default App
