// react
import React, { Component } from 'react';

// redux
import { connect } from 'react-redux';

// firebase
import firebase from '../../../../../firebase';

// app
import Icon from '@material-ui/core/Icon/Icon';
import i18n from '../../../../../assets/i18n/i18n';
import Modal from '@material-ui/core/Modal/Modal';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Input from '@material-ui/core/Input';
import Button from '@material-ui/core/Button';
import { regexLNL } from '../../../utilities/helpers/Regex';
import { setChannel } from '../../../../store/actions/ChannelAction';
import LoadingAnimation from '../../../utilities/loading-animation/LoadingAnimation';

class Channels extends Component {
	state = {
		openChannelModal: false,
		channels: [],
		channelName: '',
		channelDetails: '',
		channelsRef: firebase.database().ref('channels'),
		errors: [],
		isFormEnabled: false,
		isAnimationLoading: false,
		isFirstLoad: true
	};

	componentDidMount() {
		this.addChannelListener();
	}

	componentWillUnmount() {
		this.removeChannelListener();
	}

	render() {
		const { channels, channelName, channelDetails, isFormEnabled, errors, isAnimationLoading } = this.state;
		const { userColors } = this.props;
		const channelTitleStyle = {
			color: userColors.color_primary,
			borderColor: userColors.background.primary
		};

		return isAnimationLoading ? <LoadingAnimation/> : (
			<section className="sc-side-panel-list-wrapper">
				{/* Title */}
				<div className="sc-title">
					<h6 style={channelTitleStyle}>
						{i18n.t('CHAT.SIDE_PANEL.CHANNELS.TITLE')}<span>{channels.length}</span>
					</h6>
					<div className="cd-tooltip sc-icon-wrapper sc-cursor-pointer">
						<div className="sc-icon" style={channelTitleStyle}>
							<Icon onClick={this.handleOpenModal}>add_circle</Icon>
						</div>
						<span className="cd-arrow cd-bottom cd-fixed-right">
							{i18n.t('CHAT.SIDE_PANEL.CHANNELS.CREATE_CHANNEL')}
						</span>
					</div>
				</div>

				{/* Channel */}
				<ul className="cd-remove-bullets sc-list">
					{this.displayChannels(channels, userColors)}
				</ul>

				{/* Channel Modal */}
				<Modal open={this.state.openChannelModal}>
					<div className="sc-modal-wrapper">
						<div className="sc-modal sc-add-channel-modal">
							{/* Header */}
							<header className="sc-header">
								<h3>{i18n.t('CHAT.SIDE_PANEL.CHANNELS.MODAL.HEADER.CREATE_CHANNEL')}</h3>
								<p>{i18n.t('CHAT.SIDE_PANEL.CHANNELS.MODAL.HEADER.DESCRIPTION')}</p>
							</header>

							{/* Form */}
							<section className="cd-col sc-form">
								<form className="sc-form-fields" onSubmit={this.handleFormSubmit}>
									<FormControl className="sc-form-field" fullWidth>
										<InputLabel htmlFor="channel-name">
											{i18n.t('CHAT.SIDE_PANEL.CHANNELS.MODAL.FORM.CHANNEL_NAME.TITLE')}
										</InputLabel>
										<Input
											id="channel-name"
											name="channelName"
											value={channelName}
											onChange={this.handleInputChange}
											placeholder="e.g. react"
										/>
										<p className="ts-note">{i18n.t('CHAT.SIDE_PANEL.CHANNELS.MODAL.FORM.CHANNEL_NAME.DESCRIPTION')}</p>
									</FormControl>
									<FormControl className="sc-form-field" fullWidth>
										<InputLabel htmlFor="channel-details">
											{i18n.t('CHAT.SIDE_PANEL.CHANNELS.MODAL.FORM.CHANNEL_DETAILS.TITLE')}
										</InputLabel>
										<Input
											id="channel-details"
											name="channelDetails"
											value={channelDetails}
											onChange={this.handleInputChange}
										/>
										<p className="ts-note">{i18n.t('CHAT.SIDE_PANEL.CHANNELS.MODAL.FORM.CHANNEL_DETAILS.DESCRIPTION')}</p>
									</FormControl>
									<div className="sc-buttons">
										<Button
											className="sc-button sc-create-channel"
											variant="contained"
											type="submit"
											disabled={!isFormEnabled}>
											{i18n.t('CHAT.SIDE_PANEL.CHANNELS.MODAL.BUTTONS.T2')}
										</Button>
										<Button
											className="sc-button sc-cancel"
											variant="contained"
											type="button"
											onClick={this.handleCloseModal}>
											{i18n.t('CHAT.SIDE_PANEL.CHANNELS.MODAL.BUTTONS.T1')}
										</Button>

										{
											// Errors
											errors && errors.length > 0 && (
												<p className="cd-error">{this.displayErrors(errors)}</p>
											)
										}
									</div>
								</form>
							</section>
						</div>
					</div>
				</Modal>
			</section>
		);
	}

	/**
	 * handle open modal
	 */
	handleOpenModal = () => {
		this.setState({ openChannelModal: true });
	};

	/**
	 * handle close modal
	 */
	handleCloseModal = () => {
		this.setState({ openChannelModal: false });
	};

	/**
	 * handle input change event
	 *
	 * @param event
	 */
	handleInputChange = (event) => {
		this.setState({ [event.target.name]: event.target.value }, () => {
			// remove errors
			if (this.state.errors && this.state.errors.length > 0) {
				this.setState({ errors: null });
			}

			// validate form
			this.setState({ isFormEnabled: this.isFormValid() });
		});
	};

	/**
	 * handle form submit event
	 *
	 * @param event
	 */
	handleFormSubmit = (event) => {
		// stop default event
		event.preventDefault();

		// show loading animation
		this.setState({ isAnimationLoading: true });

		// create channel object
		const { channelsRef, channelName, channelDetails } = this.state;
		const { currentUser } = this.props;
		const keyId = channelsRef.push().key;
		const newChannel = {
			id: keyId,
			name: channelName,
			details: channelDetails,
			timestamp: firebase.database.ServerValue.TIMESTAMP,
			createdBy: {
				name: currentUser.displayName,
				email: currentUser.email
			}
		};

		// update channel
		channelsRef
			.child(keyId)
			.update(newChannel)
			.then(() => {
				// reset modal
				this.resetForm();

				// close modal
				this.handleCloseModal();

				// error
				this.setState({ isAnimationLoading: false });
			})
			.catch((error) => {
				this.setState({ errors: [error], isAnimationLoading: false });
			});
	};

	/**
	 * check form validation
	 *
	 * @returns {boolean}
	 */
	isFormValid = () => {
		return !this.isFormEmpty(this.state) && this.isChannelNameValid(this.state.channelName);
	};

	/**
	 * check whether form is empty or not
	 *
	 * @param channelName
	 * @param channelDetails
	 * @returns {boolean}
	 */
	isFormEmpty = ({ channelName, channelDetails }) => {
		return !channelName.length || !channelDetails.length;
	};

	/**
	 * check channelName validity
	 *
	 * @param channelName
	 * @returns {boolean}
	 */
	isChannelNameValid = (channelName) => {
		return regexLNL(channelName);
	};

	/**
	 * reset form
	 */
	resetForm = () => {
		this.setState({ channelName: '', channelDetails: '' });
	};

	/**
	 * display errors
	 *
	 * @param errors
	 * @returns {*}
	 */
	displayErrors = errors => errors.map((error, i) => <span key={i}>{error.message}</span>);

	/**
	 * add channel listener
	 */
	addChannelListener = () => {
		const loadedChannels = [];
		this.state.channelsRef
			.on('child_added', (snap) => {
				// push channels
				loadedChannels.push(snap.val());

				// set to channels
				// set first channel
				this.setState({ channels: loadedChannels }, () => this.setFirstChannel());
			});
	};

	/**
	 * display channels
	 *
	 * @param channels
	 * @param userColors
	 */
	displayChannels = (channels, userColors) => (
		channels && channels.length > 0 && channels.map(channel => (
			<li
				key={channel.id}
				name={channel.name}
				className={this.props.currentChannel && this.props.currentChannel.id === channel.id ? 'sc-item sc-active' : 'sc-item'}
				style={
					{
						backgroundColor:
							this.props.currentChannel &&
							this.props.currentChannel.id === channel.id ? userColors.background.primary : null
					}
				}>
				<Button
					style={{ color: userColors.color_secondary }}
					variant="contained"
					type="button"
					onClick={() => this.changeChannel(channel)}
					fullWidth>
					# {channel.name}
				</Button>
			</li>
		))
	);

	/**
	 * change channel
	 *
	 * @param channel
	 */
	changeChannel = (channel) => {
		// set current channel
		this.props.setChannel(channel);
	};

	/**
	 * set first channel
	 */
	setFirstChannel = () => {
		const { channels, isFirstLoad } = this.state;
		const { currentChannel } = this.props;
		const firstChannel = channels[0];

		// set first channel
		if (isFirstLoad && channels.length > 0 && !currentChannel) {
			// set current channel
			this.props.setChannel(firstChannel);
		}

		// unset isFirstLoad
		this.setState({ isFirstLoad: false })
	};

	/**
	 * remove channel listener
	 */
	removeChannelListener = () => {
		this.state.channelsRef.off();
	};
}

export default connect(null, { setChannel })(Channels);
