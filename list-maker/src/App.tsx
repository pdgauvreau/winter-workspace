import { useState, useEffect } from 'react'
import { AppState, Group, ListItem, List } from './types'
import { AddItemModal } from './components/AddItemModal'
import './App.css'

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize based on system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Update CSS variables based on theme
    const root = document.documentElement;
    if (isDarkMode) {
      root.style.setProperty('--color-text', '#ffffff');
      root.style.setProperty('--color-background', '#242424');
      root.style.setProperty('--color-surface', '#1a1a1a');
      root.style.setProperty('--color-border', '#404040');
    } else {
      root.style.setProperty('--color-text', '#212529');
      root.style.setProperty('--color-background', '#f8f8f8');
      root.style.setProperty('--color-surface', '#ffffff');
      root.style.setProperty('--color-border', '#dee2e6');
    }
  }, [isDarkMode]);

  const generateRandomColor = () => {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 30 + Math.floor(Math.random() * 40); // 30-70%
    const lightness = 40 + Math.floor(Math.random() * 20); // 40-60%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const generatePalette = () => {
    const root = document.documentElement;
    
    // Generate harmonious colors
    const baseHue = Math.floor(Math.random() * 360);
    const colors = [
      `hsl(${baseHue}, 60%, 50%)`, // primary
      `hsl(${(baseHue + 30) % 360}, 40%, 45%)`, // secondary
      `hsl(${(baseHue + 60) % 360}, 65%, 55%)`, // accent
      `hsl(${baseHue}, 20%, 95%)`, // background
      `hsl(${baseHue}, 10%, 100%)`, // surface
    ];
    
    root.style.setProperty('--color-primary', colors[0]);
    root.style.setProperty('--color-secondary', colors[1]);
    root.style.setProperty('--color-accent', colors[2]);
    root.style.setProperty('--color-background', colors[3]);
    root.style.setProperty('--color-surface', colors[4]);
  };

  useEffect(() => {
    generatePalette();
  }, []);

  const [state, setState] = useState<AppState>(() => {
    const initialList: List = {
      id: crypto.randomUUID(),
      name: 'New List',
      groups: [],
      items: []
    };
    return {
      lists: [initialList],
      activeListId: initialList.id
    };
  });

  const getActiveList = () => {
    return state.lists.find(list => list.id === state.activeListId)!;
  };

  const updateActiveList = (updater: (list: List) => List) => {
    setState(prev => ({
      ...prev,
      lists: prev.lists.map(list => 
        list.id === prev.activeListId ? updater(list) : list
      )
    }));
  };

  const addList = () => {
    const newList: List = {
      id: crypto.randomUUID(),
      name: 'New List',
      groups: [],
      items: []
    };
    setState(prev => ({
      lists: [...prev.lists, newList],
      activeListId: newList.id
    }));
  };

  const deleteList = (listId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (state.lists.length === 1) {
      // Don't delete the last list
      return;
    }
    setState(prev => {
      const newLists = prev.lists.filter(list => list.id !== listId);
      return {
        lists: newLists,
        activeListId: listId === prev.activeListId ? newLists[0].id : prev.activeListId
      };
    });
  };

  const deleteGroup = (groupId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    updateActiveList(list => ({
      ...list,
      groups: list.groups.filter(group => group.id !== groupId),
      // Make items in this group ungrouped
      items: list.items.map(item => 
        item.groupId === groupId ? { ...item, groupId: undefined } : item
      )
    }));
  };

  const deleteItem = (itemId: string) => {
    updateActiveList(list => ({
      ...list,
      items: list.items.filter(item => item.id !== itemId)
    }));
  };

  const switchList = (listId: string) => {
    setState(prev => ({
      ...prev,
      activeListId: listId
    }));
  };

  const addGroup = (name: string) => {
    const newGroup: Group = {
      id: crypto.randomUUID(),
      name
    };
    updateActiveList(list => ({
      ...list,
      groups: [...list.groups, newGroup]
    }));
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();

  const addItem = (item: Omit<ListItem, 'id'>) => {
    const newItem: ListItem = {
      ...item,
      id: crypto.randomUUID(),
    };
    updateActiveList(list => ({
      ...list,
      items: [...list.items, newItem]
    }));
  };

  const moveItem = (itemId: string, direction: 'up' | 'down') => {
    updateActiveList(list => {
      const itemIndex = list.items.findIndex(item => item.id === itemId);
      if (itemIndex === -1) return list;

      const newItems = [...list.items];
      if (direction === 'up' && itemIndex > 0) {
        [newItems[itemIndex], newItems[itemIndex - 1]] = 
        [newItems[itemIndex - 1], newItems[itemIndex]];
      } else if (direction === 'down' && itemIndex < newItems.length - 1) {
        [newItems[itemIndex], newItems[itemIndex + 1]] = 
        [newItems[itemIndex + 1], newItems[itemIndex]];
      }

      return {
        ...list,
        items: newItems
      };
    });
  };

  const updateListName = (name: string) => {
    updateActiveList(list => ({
      ...list,
      name
    }));
  };

  const exportListAsText = () => {
    const activeList = getActiveList();
    let content = `${activeList.name}\n\n`;

    // Add grouped items
    activeList.groups.forEach(group => {
      const groupItems = activeList.items.filter(item => item.groupId === group.id);
      if (groupItems.length > 0) {
        content += `${group.name}:\n`;
        groupItems.forEach(item => {
          content += `- ${item.text}`;
          if (item.price) content += ` ($${item.price.toFixed(2)})`;
          if (item.link) content += ` [${item.link}]`;
          content += '\n';
        });
        content += '\n';
      }
    });

    // Add ungrouped items
    const ungroupedItems = activeList.items.filter(item => !item.groupId);
    if (ungroupedItems.length > 0) {
      content += "Ungrouped Items:\n";
      ungroupedItems.forEach(item => {
        content += `- ${item.text}`;
        if (item.price) content += ` ($${item.price.toFixed(2)})`;
        if (item.link) content += ` [${item.link}]`;
        content += '\n';
      });
      content += '\n';
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeList.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shareList = () => {
    const activeList = getActiveList();
    const listData = {
      name: activeList.name,
      groups: activeList.groups,
      items: activeList.items
    };
    const encodedData = encodeURIComponent(JSON.stringify(listData));
    const shareUrl = `${window.location.origin}${window.location.pathname}?list=${encodedData}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => alert('Share link copied to clipboard!'))
        .catch(() => {
          // Fallback if clipboard API fails
          prompt('Copy this share link:', shareUrl);
        });
    } else {
      // Fallback for browsers without clipboard API
      prompt('Copy this share link:', shareUrl);
    }
  };

  // Load shared list from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedList = params.get('list');
    if (sharedList) {
      try {
        const listData = JSON.parse(decodeURIComponent(sharedList));
        const newList: List = {
          id: crypto.randomUUID(),
          name: listData.name,
          groups: listData.groups,
          items: listData.items
        };
        setState({
          lists: [newList],
          activeListId: newList.id
        });
        // Clear the URL parameter after loading
        window.history.replaceState({}, '', window.location.pathname);
      } catch (error) {
        console.error('Failed to load shared list:', error);
      }
    }
  }, []);

  return (
    <div className="app">
      <div className="sidebar">
        <h2>Lists</h2>
        <div className="lists-list">
          {state.lists.map(list => (
            <div 
              key={list.id}
              className={`list-item-wrapper`}
            >
              <div
                className={`list-item ${list.id === state.activeListId ? 'active' : ''}`}
                onClick={() => switchList(list.id)}
              >
                {list.name}
              </div>
              <button
                className="list-delete-btn"
                onClick={(e) => deleteList(list.id, e)}
                disabled={state.lists.length === 1}
                title={state.lists.length === 1 ? "Cannot delete the last list" : "Delete list"}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button 
          className="add-list-btn"
          onClick={addList}
        >
          Add List
        </button>

        <h2>Groups</h2>
        <div className="groups-list">
          <div 
            className="group-item"
            onClick={() => {
              setSelectedGroupId(undefined);
              setShowAddModal(true);
            }}
          >
            Ungrouped Items
          </div>
          {getActiveList().groups.map(group => (
            <div 
              key={group.id}
              className="group-item-wrapper"
            >
              <div 
                className="group-item"
                onClick={() => {
                  setSelectedGroupId(group.id);
                  setShowAddModal(true);
                }}
              >
                {group.name}
              </div>
              <button
                className="group-delete-btn"
                onClick={(e) => deleteGroup(group.id, e)}
                title="Delete group"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="sidebar-buttons">
          <button 
            className="add-group-btn"
            onClick={() => {
              const name = prompt('Enter group name:');
              if (name) addGroup(name);
            }}
          >
            Add Group
          </button>
          <button
            className="add-item-btn"
            onClick={() => {
              setSelectedGroupId(undefined);
              setShowAddModal(true);
            }}
          >
            Add Item
          </button>
        </div>
      </div>
      
      <div className="main-content">
        <div className="list-header">
          <div className="header-content">
            <input
              type="text"
              value={getActiveList().name}
              onChange={(e) => updateListName(e.target.value)}
              className="list-name-input"
            />
            <div className="header-buttons">
              <button 
                className="share-btn"
                onClick={shareList}
                title="Share list"
              >
                📤
              </button>
              <button 
                className="export-btn"
                onClick={exportListAsText}
                title="Export as text"
              >
                📄
              </button>
              <button 
                className="theme-toggle-btn"
                onClick={() => setIsDarkMode(!isDarkMode)}
                title="Toggle dark mode"
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
              <button 
                className="refresh-colors-btn"
                onClick={generatePalette}
                title="Generate new color palette"
              >
                🎨
              </button>
            </div>
          </div>
        </div>

        {getActiveList().groups.map(group => (
          <div key={group.id} className="group-section">
            <h3>{group.name}</h3>
            <div className="items-list">
              {getActiveList().items
                .filter(item => item.groupId === group.id)
                .map((item, index, filteredItems) => (
                  <div key={item.id} className="list-item">
                    <div className="item-content">
                      <span className="item-text">{item.text}</span>
                      {item.price && (
                        <span className="item-price">${item.price.toFixed(2)}</span>
                      )}
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="item-link">
                          🔗
                        </a>
                      )}
                      {item.mediaUrl && (
                        <img src={item.mediaUrl} alt="" className="item-media" />
                      )}
                    </div>
                    <div className="item-controls">
                      <button
                        onClick={() => moveItem(item.id, 'up')}
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveItem(item.id, 'down')}
                        disabled={index === filteredItems.length - 1}
                      >
                        ↓
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => deleteItem(item.id)}
                        title="Delete item"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
        
        <div className="items-list">
          {getActiveList().items
            .filter(item => !item.groupId)
            .map((item, index, filteredItems) => (
              <div key={item.id} className="list-item">
                <div className="item-content">
                  <span className="item-text">{item.text}</span>
                  {item.price && (
                    <span className="item-price">${item.price.toFixed(2)}</span>
                  )}
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="item-link">
                      🔗
                    </a>
                  )}
                  {item.mediaUrl && (
                    <img src={item.mediaUrl} alt="" className="item-media" />
                  )}
                </div>
                <div className="item-controls">
                  <button
                    onClick={() => moveItem(item.id, 'up')}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveItem(item.id, 'down')}
                    disabled={index === filteredItems.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => deleteItem(item.id)}
                    title="Delete item"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {showAddModal && (
        <AddItemModal
          onClose={() => setShowAddModal(false)}
          onAdd={(itemData: Omit<ListItem, 'id'>) => {
            addItem({ ...itemData, groupId: selectedGroupId });
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  )
}

export default App
