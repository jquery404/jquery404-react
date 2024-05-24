import React, { Component } from 'react';

class Log extends Component {

	constructor(props, context) {
        super(props, context);
        this.state = {
            data: [],
            totalPage: 0,
            currentPage: 1,
            hasFound: false
        };
    }
    
    handlePaging = (id) => {
        this.setState({
            currentPage: id
        });

        fetch(`https://adnke1sq71.execute-api.ap-southeast-2.amazonaws.com/default/jq404/get/${id}`)
        .then(response => response.json())
		.then((items) => {
            this.setState({
                data: items.data.slice().sort((a, b) => parseInt(b.id, 10) - parseInt(a.id, 10)), 
                totalPage: items.total_pages, 
                hasFound: true
            });
        });
    }
	
	componentDidMount () {
    
        this.handlePaging(2)

    }

    render() {
        const { data, hasFound, totalPage} = this.state;
        let tblData =[];

        data.map(item => {
            let timestamp = parseInt(item.id, 10);
            let date = new Date(timestamp * 1000);
            let humanReadableDate = date.toLocaleString();
            let parsedData;
            try {
                parsedData = JSON.parse(item.data);
                parsedData = { date: humanReadableDate, ...parsedData };
            } catch (error) {
                parsedData = `${humanReadableDate} -- ${item.data}`;
            }

            return tblData.push(parsedData);
        });


        return (
            <div className="row">
                {!hasFound ? (
                    <div>Loading...</div>
                ) : (
                    <React.Fragment>
                    <table className="log-tbl table table-responsive">
                    <thead><tr>
                    {tblData.length > 0 && Object.keys(tblData[0]).map((key) => (
                        <th key={key}>{key}</th>
                    ))}
                    </tr></thead>
                    <tbody>
                    {tblData.map((item, rowIndex) => (
                        <tr key={rowIndex}>
                            {Object.values(item).map((value, cellIndex) => (
                                <td key={cellIndex}>{value}</td>
                            ))}
                        </tr>
                    ))}
                    </tbody>
                    </table>

                    <nav aria-label="Page navigation example">
                    <ul className="pagination">
                        {Array.from({ length: totalPage }, (_, index) => (
                            <li className="page-item" key={index}>
                                <a className="page-link" onClick={() => this.handlePaging(index + 2)}>{index + 1}</a>
                            </li>
                        ))}
                    </ul>
                    </nav>
                    </React.Fragment>
                )}
            </div>
        );
    }
    

    
}

export default Log;
