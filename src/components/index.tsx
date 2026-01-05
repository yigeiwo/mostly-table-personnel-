import React from 'react';
import { IFieldMeta, ITableMeta } from '@lark-base-open/js-sdk';
import { LogEntry } from '../hooks/useConversion';

// --- Header ---
export const Header: React.FC = () => (
  <h1>人名转人员工具</h1>
);

// --- StatusCard ---
interface StatusCardProps {
  tableName: string;
  recordCount: number;
}
export const StatusCard: React.FC<StatusCardProps> = ({ tableName, recordCount }) => (
  <div className="card">
    <h3>📊 运行环境</h3>
    <p>目标表: <strong>{tableName}</strong></p>
    <p>记录数: <strong>{recordCount}</strong></p>
  </div>
);

// --- MappingSettings ---
interface MappingSettingsProps {
  tableList: ITableMeta[];
  selectedTableId: string;
  onTableChange: (id: string) => void;
  textFields: IFieldMeta[];
  selectedNameFieldId: string;
  onNameFieldChange: (id: string) => void;
  userFields: IFieldMeta[];
  selectedUserFieldId: string;
  onUserFieldChange: (id: string) => void;
  disabled?: boolean;
}
export const MappingSettings: React.FC<MappingSettingsProps> = ({
  tableList, selectedTableId, onTableChange,
  textFields, selectedNameFieldId, onNameFieldChange,
  userFields, selectedUserFieldId, onUserFieldChange,
  disabled
}) => (
  <div className="card">
    <h3>🗺️ 映射设置</h3>
    <p className="desc">请选择包含“姓名”与“人员”对应关系的映射表及字段</p>
    <div className="form-group">
      <label>选择映射表</label>
      <select 
        value={selectedTableId} 
        onChange={(e) => onTableChange(e.target.value)}
        disabled={disabled}
        className="field-select"
      >
        {tableList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </div>
    <div className="form-row">
      <div className="form-group half">
        <label>映射姓名列 (文本)</label>
        <select 
          value={selectedNameFieldId} 
          onChange={(e) => onNameFieldChange(e.target.value)}
          disabled={disabled}
          className="field-select"
        >
          {textFields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>
      <div className="form-group half">
        <label>映射人员列 (人员)</label>
        <select 
          value={selectedUserFieldId} 
          onChange={(e) => onUserFieldChange(e.target.value)}
          disabled={disabled}
          className="field-select"
        >
          {userFields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>
    </div>
  </div>
);

// --- ConversionSettings ---
interface ConversionSettingsProps {
  textFields: IFieldMeta[];
  selectedSourceId: string;
  onSourceChange: (id: string) => void;
  userFields: IFieldMeta[];
  selectedTargetId: string;
  onTargetChange: (id: string) => void;
  isConverting: boolean;
  progress: { current: number; total: number };
  onStart: () => void;
  statusMsg: string;
}
export const ConversionSettings: React.FC<ConversionSettingsProps> = ({
  textFields, selectedSourceId, onSourceChange,
  userFields, selectedTargetId, onTargetChange,
  isConverting, progress, onStart, statusMsg
}) => (
  <div className="card">
    <h3>🔄 转换设置</h3>
    <p className="desc">根据上述映射规则，将当前表的文本字段转换为人员字段</p>
    <div className="form-group">
      <label>📝 源文本列 (待转人名)</label>
      <select 
        value={selectedSourceId} 
        onChange={(e) => onSourceChange(e.target.value)}
        disabled={isConverting}
        className="field-select"
      >
        {textFields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
    </div>
    <div className="form-group">
      <label>👤 目标人员列 (填充结果)</label>
      <select 
        value={selectedTargetId} 
        onChange={(e) => onTargetChange(e.target.value)}
        disabled={isConverting}
        className="field-select"
      >
        {userFields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
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
      onClick={onStart} 
      disabled={isConverting || !selectedSourceId || !selectedTargetId}
      className={`convert-btn ${isConverting ? 'loading' : ''}`}
    >
      {isConverting ? '正在转换中...' : '开始执行转换'}
    </button>
    {statusMsg && (
      <p className={`status-msg ${statusMsg.includes('完成') || statusMsg.includes('成功') ? 'success' : 'error'}`}>
        {statusMsg}
      </p>
    )}
  </div>
);

// --- ExecutionLogs ---
export const ExecutionLogs: React.FC<{ logs: LogEntry[] }> = ({ logs }) => (
  logs.length > 0 ? (
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
  ) : null
);
