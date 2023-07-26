import React from 'react';

const itemsArray = [
    { name: 'Item 1', thumb: 'https://placehold.co/50/000000/FFFFFF/jpg' },
    { name: 'Item 2', thumb: 'https://placehold.co/50/000000/FFFFFF/jpg' },
    { name: 'Item 3', thumb: 'https://placehold.co/50/000000/FFFFFF/jpg' },
    { name: 'Item 4', thumb: 'https://placehold.co/50/000000/FFFFFF/jpg' },
    { name: 'Item 5', thumb: 'https://placehold.co/50/000000/FFFFFF/jpg' },
];

class Shop extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      searchTerm: '',
      todoList: [],
      searchResults: []
    };
  }

  handleSearchInput = (event) => {
    this.setState({ searchTerm: event.target.value });
  };

  handleKeyPress = async (event) => {
    if (event.key === 'Enter') {
        const searchTerm = this.state.searchTerm;
        const results = itemsArray.filter((item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    
        if (results.length === 0) {
            const url = 'https://edamam-food-and-grocery-database.p.rapidapi.com/api/food-database/v2/parser?ingr=' + searchTerm;
            const options = {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': 'b3225697c3msh80c53bb1c88b70dp14b331jsn0b551bb0ece8',
                    'X-RapidAPI-Host': 'edamam-food-and-grocery-database.p.rapidapi.com'
                }
            };

            fetch(url, options)
                .then(response => response.json())
                .then(items => {
                    console.log(items);
                    
                    this.setState({ searchResults: [{ name: items.parsed[0].food.label, thumb: items.parsed[0].food.image }]});
                })
                .catch(error => console.log(error));
        } else {
            this.setState({ searchResults: results });
        }
        
    }
  };

  handleAddItem = (item) => {
    this.setState((prevState) => ({
      todoList: [...prevState.todoList, item],
      searchTerm: '',
      searchResults: []
    }));
  };

  handleRemoveItem = (index) => {
    this.setState((prevState) => ({
      todoList: prevState.todoList.filter((_, i) => i !== index)
    }));
  };

  render() {
    const { searchTerm, todoList, searchResults } = this.state;

    return (
      <div>
        <h1>Shop</h1>
        <div>
        <input
            type="text"
            placeholder="Search item..."
            value={searchTerm}
            onChange={this.handleSearchInput}
            onKeyPress={this.handleKeyPress}
            style={{ marginBottom: '10px' }}
          />
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {searchResults.map((item, index) => (
            <li key={index} style={{ marginBottom: '10px' }}>
              <img
                src={item.thumb}
                alt={item.name}
                style={{ marginRight: '10px', width: '50px', height: '50px', objectFit: 'cover' }}
              />
              {item.name}{' '}
              <button
                onClick={() => this.handleAddItem(item)}
                style={{ marginLeft: '10px', padding: '5px 10px' }}
              >
                Add
              </button>
            </li>
          ))}
        </ul>
        </div>
        <div>
          <h3>Todo List:</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {todoList.map((item, index) => (
              <li key={index} style={{ marginBottom: '10px' }}>
                <img
                  src={item.thumb}
                  alt={item.name}
                  style={{ marginRight: '10px', width: '50px', height: '50px', objectFit: 'cover' }}
                />
                {item.name}
                <button
                  onClick={() => this.handleRemoveItem(index)}
                  style={{ marginLeft: '10px', padding: '5px 10px' }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
}

export default Shop;
