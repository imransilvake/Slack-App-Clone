// react
import React, { Component } from 'react';
import { Link } from 'react-router-dom';

// redux
import { connect } from 'react-redux';

// firebase
import firebase from '../../../../firebase';

// app
import md5 from 'md5';
import Button from '@material-ui/core/Button';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import SlackLogo from '../../../../assets/svg/general/slack-logo.svg';
import i18n from '../../../../assets/i18n/i18n';
import ENV from '../../../../environment/index';
import LoadingAnimation from '../../utilities/loading-animation/LoadingAnimation';
import { regexEmailValidity } from '../../utilities/helpers/Regex';
import { setUser } from '../../../store/actions/UserAction';
import _ from 'lodash';

class Register extends Component {
	state = {
		name: '',
		email: '',
		password: '',
		passwordConfirm: '',
		errors: [],
		usersRef: firebase.database().ref('users'),
		isFormEnabled: false,
		isAccountCreated: false,
		isAnimationLoading: false
	};

	render() {
		const { name, email, password, passwordConfirm, errors, isFormEnabled, isAccountCreated, isAnimationLoading } = this.state;

		const content = () => {
			switch (isAccountCreated) {
				case false:
					return (
						<section className="cd-col sc-form">
							{
								errors && errors.length > 0 && (
									/* Errors */
									<p className="cd-error">{this.displayErrors(errors)}</p>
								)
							}
							<form className="sc-form-fields" onSubmit={this.handleSubmit}>
								<FormControl className="sc-form-field" fullWidth>
									<InputLabel htmlFor="name">
										{i18n.t('AUTH.REGISTER.CONTENT.FORM.NAME')}
									</InputLabel>
									<Input
										id="name"
										name="name"
										type="text"
										value={name}
										onChange={this.handleChange}
									/>
								</FormControl>
								<FormControl className="sc-form-field" fullWidth>
									<InputLabel htmlFor="email">
										{i18n.t('AUTH.REGISTER.CONTENT.FORM.EMAIL')}
									</InputLabel>
									<Input
										id="email"
										name="email"
										type="email"
										value={email}
										error={this.handleInputError(errors, 'email')}
										onChange={this.handleChange}
									/>
								</FormControl>
								<FormControl className="sc-form-field" fullWidth>
									<InputLabel htmlFor="password">
										{i18n.t('AUTH.REGISTER.CONTENT.FORM.PASSWORD')}
									</InputLabel>
									<Input
										id="password"
										name="password"
										type="password"
										value={password}
										onChange={this.handleChange}
									/>
								</FormControl>
								<FormControl className="sc-form-field" fullWidth>
									<InputLabel htmlFor="passwordConfirm">
										{i18n.t('AUTH.REGISTER.CONTENT.FORM.CONFIRM_PASSWORD')}
									</InputLabel>
									<Input
										id="passwordConfirm"
										name="passwordConfirm"
										type="password"
										value={passwordConfirm}
										onChange={this.handleChange}
									/>
								</FormControl>
								<Button
									className="sc-button sc-register"
									variant="contained"
									type="submit"
									disabled={!isFormEnabled}
									fullWidth>
									{i18n.t('AUTH.REGISTER.CONTENT.BUTTON_TEXT')}
								</Button>
							</form>
						</section>
					);
				default:
					return (
						<section className="cd-col sc-message">
							<p>{i18n.t('AUTH.REGISTER.CONTENT.MESSAGE.T1')}</p>
							<p>
								{i18n.t('AUTH.REGISTER.CONTENT.MESSAGE.T2')}
								<Link className="cd-link" to={ENV.ROUTING.CHAT}>
									{i18n.t('AUTH.REGISTER.CONTENT.MESSAGE.LINK')}
								</Link>
							</p>
						</section>
					);
			}
		};

		return isAnimationLoading ? <LoadingAnimation/> : (
			<section className="cd-container sc-auth-wrapper">
				<div className="cd-row">
					{/* Header */}
					<header className="sc-header">
						<Link to={ENV.ROUTING.HOME}>
							<div className="cd-tooltip">
								<img src={SlackLogo} alt={i18n.t('AUTH.REGISTER.HEADER.LOGO.ALT')}/>
								<span className="cd-arrow cd-right">{i18n.t('AUTH.REGISTER.HEADER.LOGO.TOOLTIP')}</span>
							</div>
						</Link>
					</header>

					{
						/* Form | Success Message */
						content()
					}
				</div>
			</section>
		);
	}

	/**
	 * handle input change event
	 *
	 * @param event
	 */
	handleChange = (event) => {
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
	handleSubmit = (event) => {
		// stop default event
		event.preventDefault();

		const { email, password, name } = this.state;

		// show loading animation
		this.setState({ isAnimationLoading: true });

		// register user
		firebase
			.auth()
			.createUserWithEmailAndPassword(email, password)
			.then((createdUser) => {
				createdUser.user.updateProfile({
					displayName: name,
					photoURL: `http://gravatar.com/avatar/${md5(createdUser.user.email)}?d=identicon`
				}).then(() => {
					this.saveUser(createdUser)
						.then(() => {
							// set user to redux
							this.props.setUser({ ...createdUser.user, code: '1' });

							// remove errors, show success message, remove loading animation
							this.setState({ errors: null, isAccountCreated: true, isAnimationLoading: false }, () => {
								setTimeout(() => {
									// navigate to chat route
									this.props.history.push(ENV.ROUTING.CHAT);
								}, 5000);
							});
						})
						.catch((error) => {
							this.setState({ errors: [error], isAnimationLoading: false });
						});
				}).catch((error) => {
					this.setState({ errors: [error], isAnimationLoading: false });
				});
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
		if (this.isFormEmpty(this.state) || !this.isEmailValid(this.state.email)) {
			return false;
		}
		return this.isPasswordValid(this.state);
	};

	/**
	 * check whether form is empty or not
	 *
	 * @param name
	 * @param email
	 * @param password
	 * @param passwordConfirm
	 * @returns {boolean}
	 */
	isFormEmpty = ({ name, email, password, passwordConfirm }) => {
		return !name.length || !email.length || !password.length || !passwordConfirm.length;
	};

	/**
	 * check email validity
	 *
	 * @param email
	 */
	isEmailValid = (email) => {
		return regexEmailValidity(email);
	};

	/**
	 * check password validity
	 *
	 * @param password
	 * @param passwordConfirm
	 */
	isPasswordValid = ({ password, passwordConfirm }) => {
		if (password.length < 6 || passwordConfirm.length < 6) {
			return false;
		}
		return password === passwordConfirm;
	};

	/**
	 * display errors
	 *
	 * @param errors
	 * @returns {*}
	 */
	displayErrors = errors => errors.map((error, i) => <span key={i}>{error.message}</span>);

	/**
	 * handle Input Error
	 *
	 * @param errors
	 * @param fieldName
	 * @returns {*|boolean}
	 */
	handleInputError = (errors, fieldName) => {
		return !!(errors && _.find(errors, e => e.message.toLocaleLowerCase().includes(fieldName)));
	};

	/**
	 * save user to firebase
	 *
	 * @param createdUser
	 * @returns {Promise<any>}
	 */
	saveUser = (createdUser) => {
		return this.state.usersRef
			.child(createdUser.user.uid)
			.set({
				name: createdUser.user.displayName,
				avatar: createdUser.user.photoURL,
				code: '1'
			});
	};
}

export default connect(null, { setUser })(Register);
