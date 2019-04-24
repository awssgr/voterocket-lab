import React, { Component } from 'react';
import Amplify, { API, graphqlOperation } from 'aws-amplify';
import * as queries from './graphql/queries';
import * as mutations from './graphql/mutations';
import * as subscriptions from './graphql/subscriptions';
import aws_exports from './aws-exports';
import { Bar } from 'react-chartjs-2';

Amplify.configure(aws_exports);

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      candidates: []
    };
  };

  async componentDidMount() {
    try {
      const candidates = await API.graphql(graphqlOperation(queries.listCandidates))
      this.setState({
        candidates: candidates.data.listCandidates.items
      })
    } catch (err) {
      console.log('error fetching candidates...', err)
    }

    API.graphql(graphqlOperation(subscriptions.onCastVote)).subscribe({
      next: (voteCasted) => {
        const id = voteCasted.value.data.onCastVote.id
        const votes = voteCasted.value.data.onCastVote.votes
        const candidates = this.state.candidates
        const row = candidates.find( candidate => candidate.id === id );
        row.votes = votes;
        this.setState({ votes: candidates });
        console.log("state:", this.state.candidates)
      }
    })
  };

  render() {
    const candidateColors = ["red", "orange", "green", "blue"];
    return (
      <div className="App">
        <div className="container mx-auto md:w-3/5 px-3">
          <div className="text-grey-darkest md:text-lg italic mt-2 mb-3">Which is your favourite AWS serverless service?</div>
          <div className="flex py-2">
            { this.state.candidates.map((candidate,idx) =>
              <Candidate
                key={candidate.id}
                id={candidate.id}
                name={candidate.name}
                votes={candidate.votes}
                color={candidateColors[idx]}
              />
            )}
          </div>
        </div>
        <div className="container mx-auto md:w-3/5 px-3">
          <h1 className="text-lg text-grey-darkest py-6">Live updates</h1>
          <Chart data={this.state.candidates}></Chart>
        </div>
      </div>
    )
  }
}

class Chart extends Component {
  render() {
    const fontStack = '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';
    const data = {
      labels: this.props.data.map((candidate) => ( candidate.name )),
      datasets: [{
        label: false,
        data: this.props.data.map((candidate) => ( candidate.votes )),
        backgroundColor: ['#CC1F1A', '#DE751F', '#1F9D55', '#2779BD']
      }]
    };
    const options = {
      title:     { display: false },
      legend:    { display: false },
      tooltips:  { enabled: false },
      responsive: true,
      layout:    { padding: { top: 10 } },
      scales: {
        xAxes: [{gridLines: {display: false }, ticks: {fontStyle: 'bold', fontColor: '#3D4852', fontFamily: fontStack}}],
        yAxes: [{ticks: {beginAtZero: true, maxTicksLimit: 6, fontStyle: 'normal', fontColor: '#3D4852', fontFamily: fontStack}}]
      }
    }
    return (
      <Bar data={data} width={100} height={50} options={options} />
    );
  }
}

class Candidate extends Component {
  handleSubmit = async (event) => {
    const castVote = {
      id: event.id
    };
    await API.graphql(graphqlOperation(mutations.castVote, {input: castVote}));
  };

  render() {
    return (
      <button
        className={`focus:outline-none flex-1 text-white py-2 px-3 mx-1 text-sm md:h-12 h-16 rounded bg-${this.props.color}-dark hover:bg-${this.props.color}-darker`}
        onClick={() =>
          this.handleSubmit(this.props)
        }>
        {this.props.name}: <b>{this.props.votes}</b>
      </button>
    );
  }
}

export default App;
