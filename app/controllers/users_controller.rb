class UsersController < ApplicationController

  include ApplicationHelper

  before_filter :authorize, except: [:new, :create]

  def index
    if request.xhr?
      people = User.search(params[:search]).order("created_at DESC")
      @users = people.where.not(id: current_user.id)
      render partial:'/friends/search', local: @users
    elsif params[:search]
      people = User.search(params[:search]).order("created_at DESC")
      @users = people.where.not(id: current_user.id)
    else
      @users = User.all.order("created_at DESC")
    end
  end

  def new
    @user = User.new
  end

  def create
    @user = User.new(user_params)
    if @user.save
      session[:user_id] = @user.id
      redirect_to @user
    else
      flash[:error] = @user.errors.full_messages
      redirect_to :back
    end
  end

  def show
    @user = User.find(params[:id])
    render :layout => "profile_layout"
  end

  def edit
    @user = User.find(params[:id])
    if @user != current_user
      flash[:hacker] =  "That's not your Page Silly Billy!"
      redirect_to user_path(current_user)
    end
  end

  def update
    @user = User.find(params[:id])
    if @user.update_attributes(user_params)
      redirect_to @user
    else
      @errors = @user.errors.full_messages
      redirect_to edit_user_path
    end
  end

  def destroy
    @user = User.find(params[:id])
    @user.destroy
    session[:user_id] = nil
    flash[:deleted_account] = "Your account has been deleted"
    redirect_to root_path
  end

  private
  def user_params
    params.require(:user).permit(:first_name, :last_name, :username, :city, :state, :email, :password, :avatar)
  end

end